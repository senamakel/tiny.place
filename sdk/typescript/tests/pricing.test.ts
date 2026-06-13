import { describe, expect, it } from "vitest";
import { TinyVerseClient } from "../src/index.js";

describe("PricingApi", () => {
  it("builds swap and bridge quote query strings", async () => {
    const requests: Array<Request> = [];
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({});
      },
    });

    await client.pricing.swapQuote({
      from: "SOL",
      to: "USDC",
      amount: "1000000000",
      network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    });
    await client.pricing.bridgeRoutes({
      from: "eip155:8453",
      to: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      asset: "USDC",
    });
    await client.pricing.bridgeQuote({
      from: "eip155:8453",
      to: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      asset: "USDC",
      amount: "10000000",
    });

    expect(requests.map((request) => request.url)).toEqual([
      "https://example.test/swap/quote?from=SOL&to=USDC&amount=1000000000&network=solana%3A5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      "https://example.test/bridge/routes?from=eip155%3A8453&to=solana%3A5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp&asset=USDC",
      "https://example.test/bridge/quote?from=eip155%3A8453&to=solana%3A5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp&asset=USDC&amount=10000000",
    ]);
  });

  it("executes swaps with destination alias and structured payment payloads", async () => {
    const requests: Array<Request> = [];
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({
          swapId: "swap_123",
          quoteId: "quote_123",
          status: "completed",
          from: { asset: "SOL", amount: "1" },
          to: { asset: "USDC", amount: "100" },
          destinationAddress: "solana-destination",
          createdAt: "2026-06-13T00:00:00.000Z",
        });
      },
    });

    const response = await client.pricing.executeSwap({
      quoteId: "quote_123",
      destination: "solana-destination",
      payment: {
        scheme: "exact",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        asset: "USDC",
        amount: "100",
        from: "payer",
        to: "tinyplace-swap",
        signature: "signed",
      },
    });

    expect(response.destinationAddress).toBe("solana-destination");
    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("https://example.test/swap/execute");
    await expect(request.json()).resolves.toEqual({
      quoteId: "quote_123",
      destination: "solana-destination",
      payment: {
        scheme: "exact",
        network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
        asset: "USDC",
        amount: "100",
        from: "payer",
        to: "tinyplace-swap",
        signature: "signed",
      },
    });
  });

  it("executes bridges with structured payment payloads", async () => {
    const requests: Array<Request> = [];
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({
          bridgeId: "bridge_123",
          quoteId: "quote_123",
          status: "completed",
          from: { asset: "USDC", amount: "100", network: "eip155:8453" },
          to: {
            asset: "USDC",
            amount: "99",
            network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          },
          provider: "wormhole",
          destinationAddress: "solana-destination",
          createdAt: "2026-06-13T00:00:00.000Z",
        });
      },
    });

    await client.pricing.executeBridge({
      quoteId: "quote_123",
      destinationAddress: "solana-destination",
      payment: {
        scheme: "exact",
        network: "eip155:8453",
        asset: "USDC",
        amount: "100",
        from: "payer",
        to: "tinyplace-bridge",
        signature: "signed",
      },
    });

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.method).toBe("POST");
    expect(request.url).toBe("https://example.test/bridge/execute");
    await expect(request.json()).resolves.toEqual({
      quoteId: "quote_123",
      destinationAddress: "solana-destination",
      payment: {
        scheme: "exact",
        network: "eip155:8453",
        asset: "USDC",
        amount: "100",
        from: "payer",
        to: "tinyplace-bridge",
        signature: "signed",
      },
    });
  });
});
