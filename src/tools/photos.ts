import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FlickrClient } from "../flickr-client.js";

// Shared helpers

interface PhotoSummary {
  id: string;
  title: string;
  description: string;
  tags: string;
  url: string;
  date_taken: string;
  thumbnail?: string;
  img_medium?: string;
  views?: number;
  count_faves?: number;
}

function extractPhotos(res: unknown): PhotoSummary[] {
  const data = res as Record<string, unknown>;
  const photosWrapper =
    (data["photos"] as Record<string, unknown>) ??
    (data["photoset"] as Record<string, unknown>);
  if (!photosWrapper) return [];
  const list = (photosWrapper["photo"] as Array<Record<string, unknown>>) ?? [];
  return list.map(formatPhoto);
}

function formatPhoto(p: Record<string, unknown>): PhotoSummary {
  const id = String(p["id"] ?? "");
  return {
    id,
    title: titleText(p["title"]),
    description: titleText(p["description"]),
    tags: typeof p["tags"] === "string" ? p["tags"] : "",
    url: `https://www.flickr.com/photos/${p["owner"] ?? "me"}/${id}`,
    date_taken: String(p["datetaken"] ?? ""),
    thumbnail: typeof p["url_sq"] === "string" ? p["url_sq"] : undefined,
    img_medium: typeof p["url_m"] === "string" ? p["url_m"] : undefined,
    views: p["views"] != null ? Number(p["views"]) : undefined,
    count_faves: p["count_faves"] != null ? Number(p["count_faves"]) : undefined,
  };
}

function titleText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "_content" in v) return String((v as Record<string, unknown>)["_content"]);
  return "";
}

function paginationMeta(wrapper: Record<string, unknown>): {
  page: number;
  pages: number;
  per_page: number;
  total: number;
} {
  return {
    page: Number(wrapper["page"] ?? 1),
    pages: Number(wrapper["pages"] ?? 1),
    per_page: Number(wrapper["perpage"] ?? wrapper["per_page"] ?? 100),
    total: Number(wrapper["total"] ?? 0),
  };
}

// Tool registration

export function registerPhotoTools(server: McpServer, client: FlickrClient): void {
  // --- search_photos ---
  server.tool(
    "flickr_search_photos",
    {
      text: z.string().optional().describe("Free-text search query"),
      tags: z.string().optional().describe("Comma-separated tags to search"),
      user_id: z.string().optional().describe("Flickr user NSID to scope search to (use 'me' for own photos)"),
      min_taken_date: z.string().optional().describe("Minimum taken date (YYYY-MM-DD)"),
      max_taken_date: z.string().optional().describe("Maximum taken date (YYYY-MM-DD)"),
      per_page: z.number().int().min(1).max(500).default(100).describe("Results per page"),
      page: z.number().int().min(1).default(1).describe("Page number"),
    },
    async (params) => {
      const apiParams: Record<string, string> = {
        extras: "description,tags,date_taken,owner_name,url_sq,url_m,views,count_faves",
        per_page: String(params.per_page),
        page: String(params.page),
      };
      if (params.text) apiParams["text"] = params.text;
      if (params.tags) apiParams["tags"] = params.tags;
      if (params.user_id) apiParams["user_id"] = params.user_id;
      if (params.min_taken_date) apiParams["min_taken_date"] = params.min_taken_date;
      if (params.max_taken_date) apiParams["max_taken_date"] = params.max_taken_date;

      const res = await client.call("flickr.photos.search", apiParams);
      const photos = extractPhotos(res);
      const meta = paginationMeta((res as Record<string, unknown>)["photos"] as Record<string, unknown>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ...meta, photos }, null, 2) }],
      };
    }
  );

  // --- get_photo_info ---
  server.tool(
    "flickr_get_photo_info",
    {
      photo_id: z.string().describe("Flickr photo ID"),
    },
    async ({ photo_id }) => {
      const res = await client.call("flickr.photos.getInfo", { photo_id });
      const photo = (res as Record<string, unknown>)["photo"] as Record<string, unknown> | undefined;
      if (!photo) {
        return { content: [{ type: "text" as const, text: "Photo not found." }], isError: true };
      }
      const tags = (photo["tags"] as Record<string, unknown>)?.["tag"] as Array<Record<string, unknown>> | undefined;
      const info = {
        id: String(photo["id"]),
        title: titleText(photo["title"]),
        description: titleText(photo["description"]),
        tags: tags?.map((t) => String(t["raw"] ?? t["_content"])) ?? [],
        dates: photo["dates"],
        owner: photo["owner"],
        visibility: photo["visibility"],
        views: Number(photo["views"] ?? 0),
        url: (photo["urls"] as Record<string, unknown>)?.["url"],
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(info, null, 2) }] };
    }
  );

  // --- list_my_photos ---
  server.tool(
    "flickr_list_my_photos",
    {
      per_page: z.number().int().min(1).max(500).default(100).describe("Results per page"),
      page: z.number().int().min(1).default(1).describe("Page number"),
    },
    async (params) => {
      const res = await client.call("flickr.people.getPhotos", {
        user_id: "me",
        extras: "description,tags,date_taken,url_sq,url_m,views,count_faves",
        per_page: String(params.per_page),
        page: String(params.page),
      });
      const photos = extractPhotos(res);
      const meta = paginationMeta((res as Record<string, unknown>)["photos"] as Record<string, unknown>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ...meta, photos }, null, 2) }],
      };
    }
  );

  // --- set_photo_tags (overwrite) ---
  server.tool(
    "flickr_set_photo_tags",
    {
      photo_id: z.string().describe("Flickr photo ID"),
      tags: z.string().describe("Space-separated tags (replaces all existing tags). Wrap multi-word tags in quotes."),
    },
    async ({ photo_id, tags }) => {
      await client.call("flickr.photos.setTags", { photo_id, tags });
      return { content: [{ type: "text" as const, text: `Tags replaced on photo ${photo_id}.` }] };
    }
  );

  // --- add_photo_tags (append) ---
  server.tool(
    "flickr_add_photo_tags",
    {
      photo_id: z.string().describe("Flickr photo ID"),
      tags: z.string().describe("Space-separated tags to add. Wrap multi-word tags in quotes."),
    },
    async ({ photo_id, tags }) => {
      await client.call("flickr.photos.addTags", { photo_id, tags });
      return { content: [{ type: "text" as const, text: `Tags added to photo ${photo_id}.` }] };
    }
  );

  // --- set_photo_meta (title & description) ---
  server.tool(
    "flickr_set_photo_meta",
    {
      photo_id: z.string().describe("Flickr photo ID"),
      title: z.string().describe("New photo title"),
      description: z.string().default("").describe("New photo description (HTML allowed)"),
    },
    async ({ photo_id, title, description }) => {
      await client.call("flickr.photos.setMeta", { photo_id, title, description });
      return { content: [{ type: "text" as const, text: `Metadata updated for photo ${photo_id}.` }] };
    }
  );

  // --- get_photo_sizes (image URLs) ---
  server.tool(
    "flickr_get_photo_sizes",
    {
      photo_id: z.string().describe("Flickr photo ID"),
    },
    async ({ photo_id }) => {
      const res = await client.call("flickr.photos.getSizes", { photo_id });
      const sizes = (res as Record<string, unknown>)["sizes"] as Record<string, unknown> | undefined;
      const list = (sizes?.["size"] as Array<Record<string, unknown>>) ?? [];
      const result = list.map((s) => ({
        label: String(s["label"] ?? ""),
        width: Number(s["width"] ?? 0),
        height: Number(s["height"] ?? 0),
        source: String(s["source"] ?? ""),
      }));
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // --- get_not_in_set (photos not in any album) ---
  server.tool(
    "flickr_get_not_in_set",
    {
      per_page: z.number().int().min(1).max(500).default(100).describe("Results per page"),
      page: z.number().int().min(1).default(1).describe("Page number"),
    },
    async (params) => {
      const res = await client.call("flickr.photos.getNotInSet", {
        extras: "description,tags,date_taken,url_sq,url_m,views,count_faves",
        per_page: String(params.per_page),
        page: String(params.page),
      });
      const photos = extractPhotos(res);
      const meta = paginationMeta((res as Record<string, unknown>)["photos"] as Record<string, unknown>);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ...meta, photos }, null, 2) }],
      };
    }
  );

  // --- add_favorite ---
  server.tool(
    "flickr_add_favorite",
    {
      photo_id: z.string().describe("Flickr photo ID to add as favorite"),
    },
    async ({ photo_id }) => {
      try {
        await client.call("flickr.favorites.add", { photo_id });
        return { content: [{ type: "text" as const, text: `Photo ${photo_id} added to favorites.` }] };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("3")) return { content: [{ type: "text" as const, text: `Photo ${photo_id} is already in your favorites.` }] };
        throw err;
      }
    }
  );

  // --- remove_favorite ---
  server.tool(
    "flickr_remove_favorite",
    {
      photo_id: z.string().describe("Flickr photo ID to remove from favorites"),
    },
    async ({ photo_id }) => {
      try {
        await client.call("flickr.favorites.remove", { photo_id });
        return { content: [{ type: "text" as const, text: `Photo ${photo_id} removed from favorites.` }] };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("1")) return { content: [{ type: "text" as const, text: `Photo ${photo_id} is not in your favorites.` }] };
        throw err;
      }
    }
  );
}
