import type { SigningKey } from "./auth.js";

export type X402Scheme = "exact" | "upto" | "batch-settlement";

export interface X402AuthorizationFields {
  scheme: X402Scheme;
  network: string;
  asset: string;
  amount: string;
  from: string;
  to: string;
  nonce: string;
  expiresAt: string;
  metadata?: Record<string, string>;
}

export interface X402Authorization extends X402AuthorizationFields {
  signature: string;
}

function sortedMetadataEntries(
  metadata: Record<string, string> | undefined,
): Array<{ key: string; value: string }> | undefined {
  if (!metadata) return undefined;

  return Object.keys(metadata)
    .sort()
    .map((key) => ({ key, value: metadata[key]! }));
}

export function buildCanonicalMessage(fields: X402AuthorizationFields): string {
  const canonical: Record<string, unknown> = {
    domain: fields.metadata?.["domain"],
    scheme: fields.scheme,
    network: fields.network,
    asset: fields.asset,
    amount: fields.amount,
    from: fields.from,
    to: fields.to,
    nonce: fields.nonce,
    expiresAt: fields.expiresAt,
  };
  if (!canonical["domain"]) {
    delete canonical["domain"];
  }
  if (!canonical["expiresAt"]) {
    delete canonical["expiresAt"];
  }
  if (fields.metadata) {
    canonical["metadata"] = sortedMetadataEntries(fields.metadata);
  }
  return JSON.stringify(canonical);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export async function signX402Authorization(
  key: SigningKey,
  fields: X402AuthorizationFields,
): Promise<X402Authorization> {
  const message = buildCanonicalMessage(fields);
  const messageBytes = new TextEncoder().encode(message);
  const signature = await key.sign(messageBytes);
  return { ...fields, signature: toBase64(signature) };
}

export function generateNonce(prefix?: string): string {
  const random = new Uint8Array(12);
  globalThis.crypto.getRandomValues(random);
  const hex = Array.from(random)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return prefix ? `${prefix}_${hex}` : hex;
}
