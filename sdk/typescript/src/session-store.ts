import type { KeyPair } from "./crypto.js";

/**
 * A persisted hot-session-wallet grant. Stored per grantor (wallet) so a page
 * reload can restore the in-memory session key without re-prompting the wallet,
 * as long as the grant is still valid (see {@link sessionIsFresh} and the
 * backend status probe in the website's `restoreOrEstablish`).
 *
 * The session private key is kept as a {@link CryptoKey}. IndexedDB stores it
 * via structured clone, so the raw private bytes are never extracted to
 * JavaScript — unlike `localStorage`, which can only hold strings and would
 * force us to export the seed. The key remains extractable so Signal's
 * `getX25519KeyPair()` (which exports the JWK seed) keeps working.
 */
export interface StoredSession {
  /** The grantor (wallet) identity the session acts as; the record's key. */
  grantorAgentId: string;
  /** The grantor's base64 Ed25519 public key the session is delegated to. */
  grantorPublicKeyBase64: string;
  /** The session public key, hex-encoded — the backend's signer lookup key. */
  signerKey: string;
  /** The approval (grant) nonce, bound into subsequent payment signatures. */
  approvalNonce: string;
  /** RFC 3339 grant expiry; the session is discarded once past it. */
  expiresAt: string;
  /** x402 grant scope, retained so a restore can be reasoned about/audited. */
  network: string;
  asset: string;
  budget: string;
  /** The in-memory session keypair (private key as a non-exported CryptoKey). */
  keyPair: KeyPair;
}

const DB_NAME = "tinyplace";
const DB_VERSION = 1;
const STORE_NAME = "sessions";

function indexedDb(): IDBFactory | undefined {
  return typeof globalThis !== "undefined" ? globalThis.indexedDB : undefined;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const factory = indexedDb();
    if (!factory) {
      reject(new Error("IndexedDB is unavailable in this environment"));
      return;
    }
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (): void => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "grantorAgentId" });
      }
    };
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error);
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(request.error);
  });
}

/**
 * Loads the persisted session for a grantor, or undefined if none is stored or
 * IndexedDB is unavailable (e.g. SSR / Node). Never throws — a failed read
 * simply falls back to establishing a fresh session.
 */
export async function loadSession(
  grantorAgentId: string,
): Promise<StoredSession | undefined> {
  if (!indexedDb()) return undefined;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const result = await promisifyRequest<StoredSession | undefined>(
        tx.objectStore(STORE_NAME).get(grantorAgentId),
      );
      return result ?? undefined;
    } finally {
      db.close();
    }
  } catch {
    return undefined;
  }
}

/** Persists (or replaces) the session record for its grantor. */
export async function saveSession(session: StoredSession): Promise<void> {
  if (!indexedDb()) return;
  const db = await openDb();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    await promisifyRequest(tx.objectStore(STORE_NAME).put(session));
  } finally {
    db.close();
  }
}

/** Removes the persisted session for a grantor (e.g. on revoke/expiry). */
export async function clearSession(grantorAgentId: string): Promise<void> {
  if (!indexedDb()) return;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      await promisifyRequest(tx.objectStore(STORE_NAME).delete(grantorAgentId));
    } finally {
      db.close();
    }
  } catch {
    // Best-effort: a failed clear must not break re-establishment.
  }
}

/**
 * Reports whether a stored grant is still locally valid — i.e. its expiry is
 * comfortably in the future. `skewMs` guards against clock drift and against a
 * grant expiring mid-flight just after restore. This is the cheap client-side
 * check; the authoritative check is the backend signer-status probe.
 */
export function sessionIsFresh(
  session: StoredSession,
  nowMs: number,
  skewMs = 60_000,
): boolean {
  const expiresMs = Date.parse(session.expiresAt);
  if (Number.isNaN(expiresMs)) return false;
  return expiresMs > nowMs + skewMs;
}
