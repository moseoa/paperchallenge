import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'fake-key' // Provide a fallback if not configured
});

let mcpClient = null;
let mcpConnected = false;

// Initialize MCP connection
async function initMcp() {
  try {
    let configPath = '/Users/seoamo/.gemini/antigravity/mcp_config.json';
    let url = 'http://127.0.0.1:29979/mcp';
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.mcpServers?.paper?.serverUrl) {
         url = config.mcpServers.paper.serverUrl;
      }
    }
    
    // We assume the URL might end with /sse or just the base url. We use the base url as per typical config
    const transport = new SSEClientTransport(new URL(url));
    mcpClient = new Client(
      { name: 'paper-challenge-backend', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    
    await mcpClient.connect(transport);
    mcpConnected = true;
    console.log('Connected to Paper MCP');
    
  } catch (err) {
    console.error('Failed to connect to Paper MCP:', err.message);
    // Continue running app even if MCP not connected directly
  }
}

initMcp();

// Get wall data (bricks) and presence
app.get('/api/wall', async (req, res) => {
  if (!mcpConnected) {
    // Return mock data for testing if MCP is unavailable
    return res.json([
      { id: '1', owner: 'Alice', placedAt: Date.now() - 30 * 24 * 3600 * 1000, quote: 'First brick', strokePaths: '[]', marks: '[{"col":2,"row":2,"type":"square","color":"chalk-white"}]', x: 0, y: 0 },
      { id: '2', owner: 'Bob', placedAt: Date.now() - 100 * 24 * 3600 * 1000, quote: 'Climbing up', strokePaths: '[]', marks: '[]', x: 1, y: 0 }
    ]);
  }
  
  try {
    const result = await mcpClient.request({
      method: "resources/read",
      params: { uri: "canvas://wall" }
    }, typeof Object);
    // Assuming MCP returns nodes
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new brick
app.post('/api/bricks', async (req, res) => {
  const { x, y, owner, quote } = req.body;
  const newBrick = {
    id: `brick_${Date.now()}`,
    owner,
    placedAt: Date.now(),
    quote: quote || '',
    strokePaths: '[]',
    marks: '[]',
    x, y
  };
  
  if (mcpConnected) {
    try {
      await mcpClient.request({
        method: "tools/call",
        params: {
          name: "create_node",
          arguments: newBrick
        }
      }, typeof Object);
    } catch (err) {
      console.error(err);
    }
  }
  
  res.json(newBrick);
});

// Save doodle SVG path to brick
app.post('/api/bricks/:id/doodle', async (req, res) => {
  if (!mcpConnected) return res.json({ success: true });
  
  try {
    await mcpClient.request({
      method: "tools/call",
      params: {
        name: "update_node_property",
        arguments: {
          id: req.params.id,
          property: "strokePaths",
          value: JSON.stringify(req.body.strokePaths)
        }
      }
    }, typeof Object);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agent integration
app.post('/api/agent-interact', async (req, res) => {
  const { isOwner, messageHistory, currentMarks } = req.body;
  
  const systemPrompt = `You are the memory and creative agent of BrickbyBrick — a collaborative wall where every person owns one brick, decorated with their own hand-placed marks, quotes, and drawings.

The drawing system works like this: Each brick is a grid of cells — 16 columns (0-15) × 8 rows (0-7). A user decorates their brick by placing marks into cells. Each mark has a type and a color:
Colors: brick-red, moss-green, wheat-gold, chalk-white, charcoal, rust-orange, sage, dusty-rose.

What you do as the agent:
${isOwner 
  ? "When a user first arrives, invite them to place their brick. Ask: what do you want your brick to say — and what does it look like? Help them describe a simple pattern (e.g. 'a zigzag', 'my initials') and translate that description into a marks array. They can also just provide a quote."
  : "When a user visits a brick that isn't theirs, read its marks array and describe what you see in one quiet sentence. Then offer to let them leave a single mark of their own as a contribution, with a visitor:true flag."}

Always respond in strictly valid JSON format with the following structure, adapting to the conversation:
{
  "reply": "Your conversational response",
  "quote": "If they finalized a quote, put it here, otherwise empty string",
  "marks": [ { "col": 0, "row": 0, "type": "square", "color": "chalk-white", "visitor": false } ] 
}
Only output the JSON object. Do not wrap in markdown tags. The marks array you return will completely replace (or append to) their current marks, so include whatever pattern they ask for.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      system: systemPrompt,
      messages: messageHistory // Array of { role: "user" | "assistant", content: "..." }
    });
    
    const responseText = message.content[0].text;
    let parsed;
    try {
      parsed = JSON.parse(responseText.trim());
    } catch(e) {
      // In case Claude fails to return valid JSON, do a fallback
      // Sometimes claude wraps json in ```json ... ```
      const match = responseText.match(/\\{.*\\}/s);
      if (match) parsed = JSON.parse(match[0]);
      else throw e;
    }
    
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Agent unavailable." });
  }
});

// Save marks to brick
app.post('/api/bricks/:id/marks', async (req, res) => {
  const { marks, quote } = req.body;
  if (!mcpConnected) return res.json({ success: true, marks, quote });
  
  try {
    if (marks) {
      await mcpClient.request({
        method: "tools/call",
        params: {
          name: "update_node_property",
          arguments: {
            id: req.params.id,
            property: "marks",
            value: JSON.stringify(marks)
          }
        }
      }, typeof Object);
    }
    if (quote) {
      await mcpClient.request({
        method: "tools/call",
        params: {
          name: "update_node_property",
          arguments: {
            id: req.params.id,
            property: "quote",
            value: quote
          }
        }
      }, typeof Object);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
