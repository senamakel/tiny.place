import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { TinyPlaceClient } from "../client.js";
import { LocalSigner } from "../local-signer.js";
import { hexToBytes } from "./args.js";
import type { CliContext, TinyPlaceCliConfig, TinyPlaceCliOptions } from "./types.js";

export async function makeContext(options: TinyPlaceCliOptions): Promise<CliContext> {
  const env = options.env ?? process.env;
  const config = await loadCliConfig(env);
  const baseUrl =
    env.TINYPLACE_ENDPOINT ??
    env.TINYPLACE_API_URL ??
    env.NEXT_PUBLIC_API_URL ??
    config.endpoint ??
    "https://api.tiny.place";
  const seed = env.TINYPLACE_SECRET_KEY ?? config.secretKey;
  const signer = seed ? await LocalSigner.fromSeed(hexToBytes(seed)) : undefined;
  const client = new TinyPlaceClient({
    baseUrl,
    ...(signer ? { signer } : {}),
    fetch: options.fetch,
  });
  return { client, signer, env, fetch: options.fetch };
}

async function loadCliConfig(env: Record<string, string | undefined>): Promise<TinyPlaceCliConfig> {
  const configPath = env.TINYPLACE_CONFIG ?? join(homedir(), ".tinyplace", "config.json");
  try {
    const parsed = JSON.parse(await readFile(configPath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const config = parsed as Record<string, unknown>;
    return {
      ...(typeof config.endpoint === "string" ? { endpoint: config.endpoint } : {}),
      ...(typeof config.secretKey === "string" ? { secretKey: config.secretKey } : {}),
    };
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}
