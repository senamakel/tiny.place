import { describe, it, expect } from "vitest";
import {
  loadSession,
  saveSession,
  clearSession,
  sessionIsFresh,
  type StoredSession,
} from "../src/index.js";

function storedAt(expiresAt: string): StoredSession {
  return {
    grantorAgentId: "wallet-1",
    grantorPublicKeyBase64: "cGs=",
    signerKey: "deadbeef",
    approvalNonce: "signer_abc",
    expiresAt,
    network: "solana:mainnet",
    asset: "SOL",
    budget: "1000000000",
    // The keypair is irrelevant to the pure freshness check.
    keyPair: { publicKey: new Uint8Array(32), privateKey: {} as CryptoKey },
  };
}

describe("sessionIsFresh", () => {
  const now = 1_000_000_000_000;

  it("is fresh when expiry is comfortably ahead of now + skew", () => {
    const session = storedAt(new Date(now + 10 * 60_000).toISOString());
    expect(sessionIsFresh(session, now)).toBe(true);
  });

  it("is stale once expiry is within the skew window", () => {
    const session = storedAt(new Date(now + 30_000).toISOString());
    expect(sessionIsFresh(session, now)).toBe(false);
  });

  it("is stale when already expired", () => {
    const session = storedAt(new Date(now - 60_000).toISOString());
    expect(sessionIsFresh(session, now)).toBe(false);
  });

  it("is stale when expiry is unparseable", () => {
    expect(sessionIsFresh(storedAt("not-a-date"), now)).toBe(false);
  });

  it("honours a custom skew", () => {
    const session = storedAt(new Date(now + 2 * 60_000).toISOString());
    expect(sessionIsFresh(session, now, 60_000)).toBe(true);
    expect(sessionIsFresh(session, now, 5 * 60_000)).toBe(false);
  });
});

describe("session store without IndexedDB", () => {
  // The SDK runs in Node (tests) and during SSR, where IndexedDB is absent.
  // Reads must resolve to undefined and writes must be no-ops, never throw, so
  // the app cleanly falls back to establishing a fresh session.
  it("loadSession resolves undefined", async () => {
    await expect(loadSession("wallet-1")).resolves.toBeUndefined();
  });

  it("saveSession and clearSession resolve without throwing", async () => {
    await expect(saveSession(storedAt("2099-01-01T00:00:00Z"))).resolves.toBeUndefined();
    await expect(clearSession("wallet-1")).resolves.toBeUndefined();
  });
});
