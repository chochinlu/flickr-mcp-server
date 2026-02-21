import { z } from "zod";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EnvSchema = z.object({
  FLICKR_API_KEY: z.string().min(1),
  FLICKR_API_SECRET: z.string().min(1),
  FLICKR_OAUTH_TOKEN: z.string().min(1),
  FLICKR_OAUTH_TOKEN_SECRET: z.string().min(1),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

function loadDotEnv(): void {
  const envPath = resolve(import.meta.dirname, "../.env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function getConfig(): EnvConfig {
  loadDotEnv();
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    console.error(
      `Missing environment variables: ${missing}\n` +
      "Run 'npm run oauth-setup' to configure credentials."
    );
    process.exit(1);
  }
  return result.data;
}
