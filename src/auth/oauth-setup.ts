#!/usr/bin/env tsx
/**
 * One-time OAuth 1.0a setup script for Flickr.
 * Run with: npm run oauth-setup
 *
 * Prerequisites: Set FLICKR_API_KEY and FLICKR_API_SECRET in .env
 */

import { createFlickr } from "flickr-sdk";
import { createInterface } from "node:readline/promises";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(import.meta.dirname, "../../.env");

function loadEnv(): Record<string, string> {
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

function saveEnv(env: Record<string, string>): void {
  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  writeFileSync(envPath, lines.join("\n") + "\n");
}

async function main(): Promise<void> {
  const env = loadEnv();
  const apiKey = env["FLICKR_API_KEY"] || process.env["FLICKR_API_KEY"];
  const apiSecret = env["FLICKR_API_SECRET"] || process.env["FLICKR_API_SECRET"];

  if (!apiKey || !apiSecret) {
    console.error(
      "Error: FLICKR_API_KEY and FLICKR_API_SECRET are required.\n" +
      "Create a .env file with these values, or set them as environment variables.\n" +
      "Get your API key at: https://www.flickr.com/services/apps/create/"
    );
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    // Step 1: Get request token (no existing tokens yet)
    console.log("\n=== Flickr OAuth Setup ===\n");
    console.log("Step 1: Requesting temporary token...");

    const { oauth } = createFlickr({
      consumerKey: apiKey,
      consumerSecret: apiSecret,
      oauthToken: false as unknown as string,
      oauthTokenSecret: false as unknown as string,
    });

    const { requestToken, requestTokenSecret } = await oauth.request(
      "oob" // out-of-band: Flickr will display the verifier code directly on the page
    );

    // Step 2: Direct user to authorize
    const authorizeUrl = oauth.authorizeUrl(requestToken, "write");
    console.log("\nStep 2: Open this URL in your browser and authorize the app:\n");
    console.log(`  ${authorizeUrl}\n`);

    const verifier = await rl.question(
      "Step 3: After authorizing, Flickr will show a 9-digit verification code.\n" +
      "       Enter that code here:\n> "
    );

    if (!verifier.trim()) {
      console.error("Error: Verification code cannot be empty.");
      process.exit(1);
    }

    // Step 3: Exchange for access token
    console.log("\nStep 4: Exchanging for access token...");

    const { oauth: oauth2 } = createFlickr({
      consumerKey: apiKey,
      consumerSecret: apiSecret,
      oauthToken: requestToken,
      oauthTokenSecret: requestTokenSecret,
    });

    const { oauthToken, oauthTokenSecret } = await oauth2.verify(verifier.trim());

    // Step 4: Verify the token works
    console.log("Step 5: Verifying token...");

    const { flickr } = createFlickr({
      consumerKey: apiKey,
      consumerSecret: apiSecret,
      oauthToken,
      oauthTokenSecret,
    });

    const loginResult = await flickr("flickr.test.login", {});
    const username = loginResult.user?.username?._content ?? "unknown";

    console.log(`\nSuccess! Logged in as: ${username}\n`);

    // Step 5: Save to .env
    env["FLICKR_API_KEY"] = apiKey;
    env["FLICKR_API_SECRET"] = apiSecret;
    env["FLICKR_OAUTH_TOKEN"] = oauthToken;
    env["FLICKR_OAUTH_TOKEN_SECRET"] = oauthTokenSecret;
    saveEnv(env);

    console.log(`Credentials saved to ${envPath}`);
    console.log("You can now start the MCP server with: npm start");
  } finally {
    rl.close();
  }
}

main().catch((err: unknown) => {
  console.error("OAuth setup failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
