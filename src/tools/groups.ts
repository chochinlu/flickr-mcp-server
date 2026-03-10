import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FlickrClient } from "../flickr-client.js";

function titleText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "_content" in v) return String((v as Record<string, unknown>)["_content"]);
  return "";
}

export function registerGroupTools(server: McpServer, client: FlickrClient): void {
  // --- list_my_groups ---
  server.tool(
    "flickr_list_my_groups",
    {},
    async () => {
      const res = await client.call("flickr.people.getGroups");
      const data = res as Record<string, unknown>;
      const groupsWrapper = data["groups"] as Record<string, unknown> | undefined;
      const list = (groupsWrapper?.["group"] as Array<Record<string, unknown>>) ?? [];

      const groups = list.map((g) => ({
        id: String(g["nsid"] ?? g["id"] ?? ""),
        name: titleText(g["name"]),
        members: Number(g["members"] ?? 0),
        pool_count: Number(g["pool_count"] ?? 0),
        throttle_mode: String(g["throttle_mode"] ?? "none"),
        throttle_count: Number(g["throttle_count"] ?? 0),
        throttle_remaining: Number(g["throttle_remaining"] ?? 0),
      }));

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ total: groups.length, groups }, null, 2) }],
      };
    }
  );

  // --- add_photo_to_group ---
  server.tool(
    "flickr_add_photo_to_group",
    {
      photo_id: z.string().describe("Flickr photo ID"),
      group_id: z.string().describe("Flickr group ID (NSID)"),
    },
    async ({ photo_id, group_id }) => {
      try {
        await client.call("flickr.groups.pools.add", { photo_id, group_id });
        return {
          content: [{ type: "text" as const, text: `Photo ${photo_id} added to group ${group_id}.` }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("3")) return { content: [{ type: "text" as const, text: `Photo ${photo_id} is already in group ${group_id}.` }] };
        if (msg.includes("5")) return { content: [{ type: "text" as const, text: `Photo limit reached for group ${group_id}.` }] };
        if (msg.includes("6")) return { content: [{ type: "text" as const, text: `Photo ${photo_id} has been added to the group pool queue.` }] };
        if (msg.includes("2")) return { content: [{ type: "text" as const, text: `Not a member of group ${group_id}. Please join first.` }] };
        throw err;
      }
    }
  );

  // --- search_groups ---
  server.tool(
    "flickr_search_groups",
    {
      text: z.string().min(1).describe("Search keywords"),
      per_page: z.number().int().min(1).max(100).default(20).describe("Results per page"),
      page: z.number().int().min(1).default(1).describe("Page number"),
    },
    async (params) => {
      const res = await client.call("flickr.groups.search", {
        text: params.text,
        per_page: String(params.per_page),
        page: String(params.page),
      });
      const data = res as Record<string, unknown>;
      const groupsWrapper = data["groups"] as Record<string, unknown> | undefined;
      const list = (groupsWrapper?.["group"] as Array<Record<string, unknown>>) ?? [];

      const groups = list.map((g) => ({
        id: String(g["nsid"] ?? g["id"] ?? ""),
        name: titleText(g["name"]),
        members: Number(g["members"] ?? 0),
        pool_count: Number(g["pool_count"] ?? 0),
      }));

      const meta = {
        page: Number(groupsWrapper?.["page"] ?? 1),
        pages: Number(groupsWrapper?.["pages"] ?? 1),
        total: Number(groupsWrapper?.["total"] ?? 0),
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ...meta, groups }, null, 2) }],
      };
    }
  );
}
