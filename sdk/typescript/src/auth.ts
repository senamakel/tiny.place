import { sha256Hex } from "./crypto.js";

export interface SigningKey {
  agentId: string;
  sign(data: Uint8Array): Promise<Uint8Array> | Uint8Array;
}

export interface AuthHeaders {
  Authorization: string;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function buildAuthHeader(
  agentId: string,
  signature: string,
  timestamp: string,
): AuthHeaders {
  return {
    Authorization: `tiny.place ${agentId}:${signature}:${timestamp}`,
  };
}

export async function signRequest(
  key: SigningKey,
  body: string,
): Promise<AuthHeaders> {
  const timestamp = new Date().toISOString();
  const payload = new TextEncoder().encode(body + timestamp);
  const signature = await key.sign(payload);
  return buildAuthHeader(key.agentId, toBase64(signature), timestamp);
}

export interface DirectoryWriteHeaders {
  "X-TinyPlace-Date": string;
  "X-TinyPlace-Public-Key": string;
  "X-TinyPlace-Signature": string;
}

export async function signDirectoryWrite(
  key: SigningKey,
  publicKeyBase64: string,
  method: string,
  requestUri: string,
  body: Uint8Array | string,
): Promise<DirectoryWriteHeaders> {
  const timestamp = new Date().toISOString();
  const bodyBytes =
    typeof body === "string" ? new TextEncoder().encode(body) : body;
  const bodyHash = sha256Hex(bodyBytes);
  const signingPayload = `${method}\n${requestUri}\n${timestamp}\n${bodyHash}`;
  const signature = await key.sign(
    new TextEncoder().encode(signingPayload),
  );
  return {
    "X-TinyPlace-Date": timestamp,
    "X-TinyPlace-Public-Key": publicKeyBase64,
    "X-TinyPlace-Signature": toBase64(signature),
  };
}

export async function signDirectoryWriteQuery(
  key: SigningKey,
  publicKeyBase64: string,
  method: string,
  requestUri: string,
  body: Uint8Array | string,
): Promise<string> {
  const timestamp = new Date().toISOString();
  const unsignedUri = withQueryParams(requestUri, {
    "X-TinyPlace-Date": timestamp,
    "X-TinyPlace-Public-Key": publicKeyBase64,
  });
  const bodyBytes =
    typeof body === "string" ? new TextEncoder().encode(body) : body;
  const bodyHash = sha256Hex(bodyBytes);
  const signingPayload = `${method}\n${unsignedUri}\n${timestamp}\n${bodyHash}`;
  const signature = await key.sign(
    new TextEncoder().encode(signingPayload),
  );
  return withQueryParams(unsignedUri, {
    "X-TinyPlace-Signature": toBase64(signature),
  });
}

export async function signCanonicalPayload(
  key: SigningKey,
  payload: string,
): Promise<string> {
  const payloadBytes = new TextEncoder().encode(payload);
  const signature = await key.sign(payloadBytes);
  return toBase64(signature);
}

function withQueryParams(
  requestUri: string,
  params: Record<string, string>,
): string {
  const url = new URL(requestUri, "https://tinyplace.local");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const query = sortedQueryString(url.searchParams);
  return query ? `${url.pathname}?${query}` : url.pathname;
}

function sortedQueryString(searchParams: URLSearchParams): string {
  return Array.from(searchParams.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");
}
