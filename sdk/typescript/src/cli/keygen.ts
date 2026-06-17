import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { ed25519 } from "@noble/curves/ed25519.js";
import { publicKeyToSolanaAddress } from "../crypto.js";
import { boolFlag, bytesToHex, numberFlag, requiredFlag, stringFlag } from "./args.js";
import type { CliContext, Flags } from "./types.js";

// A tiny.place wallet address is the base58 Solana address (== signer.agentId).
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
// Encoding 32 bytes in base58 yields a 44-char address ~96% of the time, and a
// 44-char address can only begin with one of these "leadable" characters. A
// prefix whose first character is leadable grinds fast; anything else (lowercase,
// R–Z, etc.) only appears in the rare ~4% short-encoding case and is very slow.
const LEADABLE_FIRST = "123456789ABCDEFGHJKLMNPQ";

export interface VanityHit {
  seedHex: string;
  address: string;
  attempts: number;
}

export function validateVanityPrefix(prefix: string): void {
  if (!prefix) {
    throw new Error("usage: --vanity <prefix>");
  }
  for (const char of prefix) {
    if (!BASE58_ALPHABET.includes(char)) {
      throw new Error(
        `'${char}' is not a base58 character — addresses exclude 0 (zero), O, I, and l. ` +
          `Try a prefix using only: ${BASE58_ALPHABET}`,
      );
    }
  }
}

function randomSeed(): Uint8Array {
  const seed = new Uint8Array(32);
  globalThis.crypto.getRandomValues(seed);
  return seed;
}

/** Grinds random keypairs until the base58 address matches `prefix`, or the budget runs out. */
export function grindVanity(
  prefix: string,
  options: { timeoutMs: number; ignoreCase: boolean; now: () => number },
): VanityHit | null {
  const needle = options.ignoreCase ? prefix.toLowerCase() : prefix;
  const deadline = options.now() + options.timeoutMs;
  let attempts = 0;
  while (options.now() < deadline) {
    // Batch so we don't read the clock every iteration.
    for (let index = 0; index < 5000; index += 1) {
      attempts += 1;
      const seed = randomSeed();
      const address = publicKeyToSolanaAddress(ed25519.getPublicKey(seed));
      const head = options.ignoreCase
        ? address.slice(0, prefix.length).toLowerCase()
        : address.slice(0, prefix.length);
      if (head === needle) {
        return { seedHex: bytesToHex(seed), address, attempts };
      }
    }
  }
  return null;
}

export async function runKeygen(ctx: CliContext, flags: Flags): Promise<unknown> {
  const prefix = requiredFlag(flags, "vanity");
  validateVanityPrefix(prefix);
  const ignoreCase = boolFlag(flags, "ignore-case");
  const timeoutMs = Math.max(1, numberFlag(flags, "timeout") ?? 30) * 1000;

  const firstLeadable = LEADABLE_FIRST.includes(prefix[0] ?? "");
  const startedAt = Date.now();
  const hit = grindVanity(prefix, { timeoutMs, ignoreCase, now: () => Date.now() });
  const seconds = Math.round((Date.now() - startedAt) / 100) / 10;

  if (!hit) {
    return {
      found: false,
      prefix,
      seconds,
      hint: firstLeadable
        ? "Not found in the time budget — raise --timeout or shorten the prefix."
        : `'${prefix[0]}' rarely leads an address, so this is slow. Use a leadable first ` +
          `character (one of ${LEADABLE_FIRST}) or pass --timeout <seconds>.`,
    };
  }

  await persistSecretKey(ctx.env, hit.seedHex);
  return {
    wallet: hit.address,
    prefix,
    attempts: hit.attempts,
    seconds,
    saved: true,
    previousWallet: ctx.signer?.agentId,
    note: "This is now your wallet/identity. Back up ~/.tinyplace/config.json — losing it loses the wallet.",
  };
}

async function persistSecretKey(env: Record<string, string | undefined>, secretKey: string): Promise<void> {
  const configPath = env.TINYPLACE_CONFIG ?? join(homedir(), ".tinyplace", "config.json");
  let existing: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(await readFile(configPath, "utf8")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      existing = parsed as Record<string, unknown>;
    }
  } catch {
    // No existing config — start fresh.
  }
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify({ ...existing, secretKey }, null, 2)}\n`, { mode: 0o600 });
}
