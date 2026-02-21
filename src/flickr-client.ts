import { createFlickr, type Flickr } from "flickr-sdk";
import type { EnvConfig } from "./config.js";

// Rate limiter: enforce minimum interval between requests (Flickr allows ~1 req/sec)
const MIN_INTERVAL_MS = 1000;
let lastRequestTime = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export interface FlickrClient {
  call(method: string, params?: Record<string, string>): Promise<unknown>;
}

export function createClient(config: EnvConfig): FlickrClient {
  const { flickr } = createFlickr({
    consumerKey: config.FLICKR_API_KEY,
    consumerSecret: config.FLICKR_API_SECRET,
    oauthToken: config.FLICKR_OAUTH_TOKEN,
    oauthTokenSecret: config.FLICKR_OAUTH_TOKEN_SECRET,
  });

  return {
    async call(method: string, params: Record<string, string> = {}): Promise<unknown> {
      await throttle();
      // flickr-sdk types require keyof API; we use dynamic method names
      return (flickr as (m: string, p: Record<string, string>) => Promise<unknown>)(method, params);
    },
  };
}
