import { describe, expect, it } from "vitest";

import {
  SOLANA_USDC_MINT,
  deriveAssociatedTokenAddress,
} from "../src/solana.js";

describe("deriveAssociatedTokenAddress", () => {
  // Oracle vector generated with gagliardetto/solana-go (the exact library the
  // backend x402 facilitator uses to derive the destination ATA it verifies):
  //   FindAssociatedTokenAddress(owner, USDC mint) -> FGETo8... (bump 254)
  it("matches the solana-go ATA for a known owner+mint", () => {
    const owner = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    expect(deriveAssociatedTokenAddress(owner, SOLANA_USDC_MINT)).toBe(
      "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B",
    );
  });
});
