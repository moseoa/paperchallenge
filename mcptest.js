import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import fs from "fs";

async function main() {
  try {
    const config = JSON.parse(fs.readFileSync('/Users/seoamo/.gemini/antigravity/mcp_config.json', 'utf8'));
    const url = config.mcpServers.paper.serverUrl;
    console.log("Connecting to", url);

    const transport = new SSEClientTransport(new URL(url));
    const client = new Client(
      { name: "paper-app", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );



    await client.connect(transport);
    console.log("Connected!");
    
    const tools = await client.request({
      method: "tools/list"
    }, typeof Object);
    console.log("Tools:", JSON.stringify(tools, null, 2));

    const resources = await client.request({
      method: "resources/list"
    }, typeof Object);
    console.log("Resources:", JSON.stringify(resources, null, 2));

    // Try reading the canvas
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
