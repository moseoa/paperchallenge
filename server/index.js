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
      { id: '1', owner: 'Alice', placedAt: Date.now() - 30 * 24 * 3600 * 1000, quote: 'First brick', strokePaths: [], x: 0, y: 0 },
      { id: '2', owner: 'Bob', placedAt: Date.now() - 100 * 24 * 3600 * 1000, quote: 'Climbing up', strokePaths: [], x: 1, y: 0 }
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
app.post('/api/suggest-quote', async (req, res) => {
  const { owner, ageDays, neighborQuotes } = req.body;
  
  try {
    const tools = mcpConnected ? (await mcpClient.request({ method: "tools/list" }, typeof Object)).tools : [];
    
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 150,
      system: "You are a poet assisting users adding quotes to a brick wall. The wall vines grow as bricks age. Provide a short, pithy quote maximum 10 words.",
      messages: [
        {
          role: "user",
          content: `Suggest a quote for a brick placed by ${owner}. The brick is ${ageDays} days old. Neighboring quotes are: ${neighborQuotes.join(', ')}.`
        }
      ],
      // We pass MCP tools directly to claude if we want them to do stuff, but the prompt says they just *read* context to return a quote!
    });
    
    // In Anthropic API, it returns message.content
    const suggestion = message.content[0].text;
    res.json({ suggestion });
  } catch (err) {
    console.error(err);
    res.json({ suggestion: "Time grows all things." }); // Fallback
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
