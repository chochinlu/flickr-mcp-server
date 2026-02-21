import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FlickrClient } from "../flickr-client.js";

function titleText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "_content" in v) return String((v as Record<string, unknown>)["_content"]);
  return "";
}

export function registerAlbumTools(server: McpServer, client: FlickrClient): void {
  // --- list_albums ---
  server.tool(
    "flickr_list_albums",
    {
      per_page: z.number().int().min(1).max(500).default(100).describe("Results per page"),
      page: z.number().int().min(1).default(1).describe("Page number"),
    },
    async (params) => {
      const res = await client.call("flickr.photosets.getList", {
        per_page: String(params.per_page),
        page: String(params.page),
      });
      const data = res as Record<string, unknown>;
      const setsWrapper = data["photosets"] as Record<string, unknown> | undefined;
      const sets = (setsWrapper?.["photoset"] as Array<Record<string, unknown>>) ?? [];

      const albums = sets.map((s) => ({
        id: String(s["id"]),
        title: titleText(s["title"]),
        description: titleText(s["description"]),
        photos: Number(s["photos"] ?? 0),
        videos: Number(s["videos"] ?? 0),
        primary: String(s["primary"] ?? ""),
        date_create: String(s["date_create"] ?? ""),
        date_update: String(s["date_update"] ?? ""),
      }));

      const meta = {
        page: Number(setsWrapper?.["page"] ?? 1),
        pages: Number(setsWrapper?.["pages"] ?? 1),
        total: Number(setsWrapper?.["total"] ?? 0),
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ...meta, albums }, null, 2) }],
      };
    }
  );

  // --- get_album_photos ---
  server.tool(
    "flickr_get_album_photos",
    {
      photoset_id: z.string().describe("Album (photoset) ID"),
      per_page: z.number().int().min(1).max(500).default(100).describe("Results per page"),
      page: z.number().int().min(1).default(1).describe("Page number"),
    },
    async (params) => {
      const res = await client.call("flickr.photosets.getPhotos", {
        photoset_id: params.photoset_id,
        extras: "description,tags,date_taken,url_sq,url_m",
        per_page: String(params.per_page),
        page: String(params.page),
      });
      const data = res as Record<string, unknown>;
      const photoset = data["photoset"] as Record<string, unknown> | undefined;
      const list = (photoset?.["photo"] as Array<Record<string, unknown>>) ?? [];

      const photos = list.map((p) => ({
        id: String(p["id"]),
        title: titleText(p["title"]),
        description: titleText(p["description"]),
        tags: typeof p["tags"] === "string" ? p["tags"] : "",
        date_taken: String(p["datetaken"] ?? ""),
        thumbnail: typeof p["url_sq"] === "string" ? p["url_sq"] : undefined,
        img_medium: typeof p["url_m"] === "string" ? p["url_m"] : undefined,
      }));

      const meta = {
        page: Number(photoset?.["page"] ?? 1),
        pages: Number(photoset?.["pages"] ?? 1),
        total: Number(photoset?.["total"] ?? 0),
        album_title: titleText(photoset?.["title"]),
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify({ ...meta, photos }, null, 2) }],
      };
    }
  );

  // --- create_album ---
  server.tool(
    "flickr_create_album",
    {
      title: z.string().min(1).describe("Album title"),
      description: z.string().default("").describe("Album description"),
      primary_photo_id: z.string().describe("Photo ID to use as album cover (required by Flickr)"),
    },
    async ({ title, description, primary_photo_id }) => {
      const res = await client.call("flickr.photosets.create", {
        title,
        description,
        primary_photo_id,
      });
      const photoset = (res as Record<string, unknown>)["photoset"] as Record<string, unknown> | undefined;
      const id = String(photoset?.["id"] ?? "");
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ id, title, message: "Album created." }, null, 2) }],
      };
    }
  );

  // --- add_photo_to_album ---
  server.tool(
    "flickr_add_photo_to_album",
    {
      photoset_id: z.string().describe("Album (photoset) ID"),
      photo_id: z.string().describe("Photo ID to add"),
    },
    async ({ photoset_id, photo_id }) => {
      await client.call("flickr.photosets.addPhoto", { photoset_id, photo_id });
      return {
        content: [{ type: "text" as const, text: `Photo ${photo_id} added to album ${photoset_id}.` }],
      };
    }
  );

  // --- remove_photo_from_album ---
  server.tool(
    "flickr_remove_photo_from_album",
    {
      photoset_id: z.string().describe("Album (photoset) ID"),
      photo_id: z.string().describe("Photo ID to remove"),
    },
    async ({ photoset_id, photo_id }) => {
      await client.call("flickr.photosets.removePhoto", { photoset_id, photo_id });
      return {
        content: [{ type: "text" as const, text: `Photo ${photo_id} removed from album ${photoset_id}.` }],
      };
    }
  );

  // --- edit_album_meta ---
  server.tool(
    "flickr_edit_album_meta",
    {
      photoset_id: z.string().describe("Album (photoset) ID"),
      title: z.string().min(1).describe("New album title"),
      description: z.string().default("").describe("New album description"),
    },
    async ({ photoset_id, title, description }) => {
      await client.call("flickr.photosets.editMeta", { photoset_id, title, description });
      return {
        content: [{ type: "text" as const, text: `Album ${photoset_id} metadata updated.` }],
      };
    }
  );
}
