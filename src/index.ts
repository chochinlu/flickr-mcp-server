#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config.js";
import { createClient } from "./flickr-client.js";
import { registerPhotoTools } from "./tools/photos.js";
import { registerAlbumTools } from "./tools/albums.js";

const config = getConfig();
const client = createClient(config);

const server = new McpServer({
  name: "flickr-mcp-server",
  version: "1.0.0",
});

registerPhotoTools(server, client);
registerAlbumTools(server, client);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Flickr MCP server running on stdio");
}

main().catch((err: unknown) => {
  console.error("Fatal:", err);
  process.exit(1);
});
