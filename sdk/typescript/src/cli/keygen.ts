import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { ed25519 } from "@noble/curves/ed25519.js";
import { publicKeyToSolanaAddress } from "../crypto.js";
import { bytesToHex, numberFlag, requiredFlag } from "./args.js";
import type { CliContext, Flags } from "./types.js";

// A tiny.place wallet address is the base58 Solana address (== signer.agentId).
// Matching is case-insensitive, so a base58 address lowercases to [1-9a-z]: any
// letter or a digit 1-9 is a valid prefix character (only "0" is impossible).
const VALID_PREFIX_CHARS = "123456789abcdefghijklmnopqrstuvwxyz";
const MAX_TIMEOUT_SECONDS = 60;

export interface VanityHit {
  seedHex: string;
  address: string;
  attempts: number;
}

export interface VanityWallet extends VanityHit {
  matched: boolean;
}

export function validateVanityPrefix(prefix: string): void {
  if (!prefix) {
    throw new Error("usage: --vanity <prefix>");
  }
  for (const char of prefix.toLowerCase()) {
    if (!VALID_PREFIX_CHARS.includes(char)) {
      throw new Error(
        `'${char}' can never appear in a wallet address — base58 has no "0" (zero) and no symbols. ` +
          "Use letters or digits 1-9.",
      );
    }
  }
}

function randomSeed(): Uint8Array {
  // Fresh CSPRNG bytes every attempt — the grind is fully randomized.
  const seed = new Uint8Array(32);
  globalThis.crypto.getRandomValues(seed);
  return seed;
}

function addressForSeed(seed: Uint8Array): string {
  return publicKeyToSolanaAddress(ed25519.getPublicKey(seed));
}

/** Grinds random keypairs until the address starts (case-insensitively) with `prefix`, or the budget runs out. */
export function grindVanity(
  prefix: string,
  options: { timeoutMs: number; now: () => number },
): VanityHit | null {
  const needle = prefix.toLowerCase();
  const deadline = options.now() + options.timeoutMs;
  let attempts = 0;
  while (options.now() < deadline) {
    // Batch so we don't read the clock every iteration.
    for (let index = 0; index < 5000; index += 1) {
      attempts += 1;
      const seed = randomSeed();
      const address = addressForSeed(seed);
      if (address.slice(0, prefix.length).toLowerCase() === needle) {
        return { seedHex: bytesToHex(seed), address, attempts };
      }
    }
  }
  return null;
}

/** Grinds for a vanity prefix within the budget; on timeout, returns a fresh random wallet. */
export function generateVanityWallet(
  prefix: string,
  options: { timeoutMs: number; now: () => number },
): VanityWallet {
  const hit = grindVanity(prefix, options);
  if (hit) {
    return { ...hit, matched: true };
  }
  const seed = randomSeed();
  return { seedHex: bytesToHex(seed), address: addressForSeed(seed), attempts: 0, matched: false };
}

export async function runKeygen(ctx: CliContext, flags: Flags): Promise<unknown> {
  const prefix = requiredFlag(flags, "vanity");
  validateVanityPrefix(prefix);
  const timeoutSeconds = Math.min(MAX_TIMEOUT_SECONDS, Math.max(1, numberFlag(flags, "timeout") ?? MAX_TIMEOUT_SECONDS));
  const timeoutMs = timeoutSeconds * 1000;

  const startedAt = Date.now();
  const wallet = generateVanityWallet(prefix, { timeoutMs, now: () => Date.now() });
  const seconds = Math.round((Date.now() - startedAt) / 100) / 10;

  await persistSecretKey(ctx.env, wallet.seedHex);
  return {
    wallet: wallet.address,
    prefix,
    matched: wallet.matched,
    ...(wallet.matched ? { attempts: wallet.attempts } : { fallbackRandom: true }),
    seconds,
    saved: true,
    previousWallet: ctx.signer?.agentId,
    note: wallet.matched
      ? "Vanity wallet saved as your identity. Back up ~/.tinyplace/config.json — losing it loses the wallet."
      : `No '${prefix}' wallet found within ${timeoutSeconds}s — saved a random wallet instead. ` +
        "Back up ~/.tinyplace/config.json — losing it loses the wallet.",
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
