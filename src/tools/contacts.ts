import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FlickrClient } from "../flickr-client.js";

export function registerContactTools(server: McpServer, client: FlickrClient): void {
  // --- follow_user (add contact) ---
  server.tool(
    "flickr_follow_user",
    {
      user_id: z.string().describe("Flickr user NSID to follow (e.g. '12345678@N00')"),
    },
    async ({ user_id }) => {
      try {
        await client.call("flickr.contacts.add", { user_id });
        return { content: [{ type: "text" as const, text: `Now following user ${user_id}.` }] };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("2")) return { content: [{ type: "text" as const, text: `User ${user_id} already in your contacts.` }] };
        throw err;
      }
    }
  );

  // --- unfollow_user (remove contact) ---
  server.tool(
    "flickr_unfollow_user",
    {
      user_id: z.string().describe("Flickr user NSID to unfollow (e.g. '12345678@N00')"),
    },
    async ({ user_id }) => {
      try {
        await client.call("flickr.contacts.remove", { user_id });
        return { content: [{ type: "text" as const, text: `Unfollowed user ${user_id}.` }] };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("1")) return { content: [{ type: "text" as const, text: `User ${user_id} is not in your contacts.` }] };
        throw err;
      }
    }
  );
}
