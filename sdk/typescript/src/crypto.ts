import { sha256 } from "@noble/hashes/sha2.js";
import type { SigningKey } from "./auth.js";

const crypto = globalThis.crypto;

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: CryptoKey;
}

export async function generateKeyPair(): Promise<KeyPair> {
  const pair = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ]);
  const publicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", pair.publicKey),
  );
  return { publicKey: publicKeyRaw, privateKey: pair.privateKey };
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function publicKeyToHex(publicKey: Uint8Array): string {
  return toHex(publicKey);
}

export function publicKeyToBase64(publicKey: Uint8Array): string {
  return toBase64(publicKey);
}

export function publicKeyToSolanaAddress(publicKey: Uint8Array): string {
  let encoded = 0n;
  for (const byte of publicKey) {
    encoded = (encoded << 8n) + BigInt(byte);
  }

  let value = "";
  while (encoded > 0n) {
    const digit = Number(encoded % 58n);
    value = BASE58_ALPHABET[digit]! + value;
    encoded /= 58n;
  }

  for (const byte of publicKey) {
    if (byte !== 0) break;
    value = "1" + value;
  }

  return value || "1";
}

export function deriveCryptoId(publicKey: Uint8Array): string {
  return publicKeyToSolanaAddress(publicKey);
}

export function sha256Hex(data: Uint8Array | string): string {
  const input =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  return toHex(sha256(input));
}

export function canonicalPayload(
  action: string,
  fields: Record<string, unknown>,
): string {
  return stableStringify({ action, fields });
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(input).sort()) {
      output[key] = sortValue(input[key]);
    }
    return output;
  }

  return value;
}

export function createSigningKey(
  agentId: string,
  privateKey: CryptoKey,
): SigningKey {
  return {
    agentId,
    async sign(data: Uint8Array): Promise<Uint8Array> {
      const buffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(buffer).set(data);
      const sig = await crypto.subtle.sign("Ed25519", privateKey, buffer);
      return new Uint8Array(sig);
    },
  };
}
