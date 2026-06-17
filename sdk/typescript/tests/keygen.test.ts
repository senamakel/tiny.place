import { describe, expect, it } from "vitest";
import { grindVanity, validateVanityPrefix } from "../src/cli/keygen.js";

describe("vanity keygen", () => {
  it("accepts valid base58 prefixes and rejects invalid characters", () => {
    expect(() => validateVanityPrefix("A1")).not.toThrow();
    expect(() => validateVanityPrefix("tiny")).not.toThrow(); // valid base58, just slow to grind
    // base58 excludes 0, O, I, l.
    expect(() => validateVanityPrefix("TINY")).toThrowError(/not a base58 character/);
    expect(() => validateVanityPrefix("0x")).toThrowError(/not a base58 character/);
    expect(() => validateVanityPrefix("")).toThrowError(/--vanity/);
  });

  it("grinds an address with a leadable prefix", () => {
    // "1" leads ~1/25 of addresses, so this resolves in a handful of attempts.
    const hit = grindVanity("1", { timeoutMs: 10_000, ignoreCase: false, now: () => Date.now() });
    expect(hit).not.toBeNull();
    expect(hit!.address.startsWith("1")).toBe(true);
    expect(hit!.seedHex).toMatch(/^[0-9a-f]{64}$/);
    expect(hit!.attempts).toBeGreaterThan(0);
  });

  it("respects the time budget and returns null when it cannot match", () => {
    // A fixed clock that is already past the deadline -> zero attempts, no match.
    let tick = 0;
    const result = grindVanity("Q", { timeoutMs: 1, ignoreCase: false, now: () => (tick += 1000) });
    expect(result).toBeNull();
  });
});
