/**
 * Batch update all photos to a specified license.
 *
 * Usage:
 *   npx tsx scripts/batch-set-license.ts [license_id]
 *
 * license_id defaults to 0 (All Rights Reserved).
 * Dry-run first with --dry-run flag.
 */

import { getConfig } from "../src/config.js";
import { createClient, type FlickrClient } from "../src/flickr-client.js";

const TARGET_LICENSE = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? "0");
const DRY_RUN = process.argv.includes("--dry-run");
const EXTRA_DELAY_MS = 200; // 1s throttle + 200ms = 1.2s/req → ~3000 req/hour

async function callWithRetry(client: FlickrClient, method: string, params: Record<string, string>, retries = 3): Promise<unknown> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await new Promise((r) => setTimeout(r, EXTRA_DELAY_MS));
      return await client.call(method, params);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("limit") && attempt < retries) {
        const wait = 60 * attempt;
        console.log(`  Rate limited, waiting ${wait}s before retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, wait * 1000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

async function main() {
  const config = getConfig();
  const client = createClient(config);

  console.log(`Target license: ${TARGET_LICENSE} (${DRY_RUN ? "DRY RUN" : "LIVE"})`);

  // Collect all photo IDs
  const PER_PAGE = 500;
  let page = 1;
  let totalPages = 1;
  const photoIds: string[] = [];

  console.log("Fetching photo list...");
  while (page <= totalPages) {
    const res = (await callWithRetry(client, "flickr.people.getPhotos", {
      user_id: "me",
      per_page: String(PER_PAGE),
      page: String(page),
      extras: "license",
    })) as { photos: { photo: Array<{ id: string; license: string }>; pages: number; total: number } };

    totalPages = res.photos.pages;

    for (const p of res.photos.photo) {
      if (String(p.license) !== String(TARGET_LICENSE)) {
        photoIds.push(p.id);
      }
    }

    const fetched = (page - 1) * PER_PAGE + res.photos.photo.length;
    console.log(`  Page ${page}/${totalPages} — ${fetched}/${res.photos.total} scanned, ${photoIds.length} need update`);
    page++;
  }

  console.log(`\nTotal photos needing license update: ${photoIds.length}`);

  if (DRY_RUN) {
    console.log("Dry run complete. No changes made.");
    return;
  }

  if (photoIds.length === 0) {
    console.log("All photos already have the correct license.");
    return;
  }

  // Update licenses
  let success = 0;
  let errors = 0;

  for (let i = 0; i < photoIds.length; i++) {
    try {
      await callWithRetry(client, "flickr.photos.licenses.setLicense", {
        photo_id: photoIds[i],
        license_id: String(TARGET_LICENSE),
      });
      success++;
    } catch (err: unknown) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Error on ${photoIds[i]}: ${msg}`);
    }
    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${photoIds.length} (${success} ok, ${errors} err)`);
    }
  }

  console.log(`\nDone! ${success} updated, ${errors} errors.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
