import { describe, expect, it } from "vitest";
import { TinyPlaceClient } from "../src/index.js";

describe("SolanaApi", () => {
  it("fetches public chain metadata", async () => {
    const requests: Array<Request> = [];
    const client = new TinyPlaceClient({
      baseUrl: "https://example.test",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({
          network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
          name: "Solana",
          kind: "solana",
          nativeAsset: "SOL",
          explorerUrl: "https://solscan.io",
          confirmations: 32,
          assets: [{ symbol: "SOL", decimals: 9 }],
          rpc: {
            url: "https://example.test/solana/rpc",
            rateLimitPerMin: 20,
            fallbacks: true,
          },
        });
      },
    });

    const info = await client.solana.info();

    expect(info.rpc.url).toBe("https://example.test/solana/rpc");
    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe("GET");
    expect(requests[0]!.url).toBe("https://example.test/solana");
  });

  it("posts JSON-RPC requests to the tiny.place proxy", async () => {
    const requests: Array<Request> = [];
    const client = new TinyPlaceClient({
      baseUrl: "https://example.test",
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        return Response.json({
          jsonrpc: "2.0",
          id: "getHealth",
          result: "ok",
        });
      },
    });

    const response = await client.solana.rpc<string>({
      jsonrpc: "2.0",
      id: "getHealth",
      method: "getHealth",
    });

    expect(response.result).toBe("ok");
    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe("POST");
    expect(requests[0]!.url).toBe("https://example.test/solana/rpc");
    await expect(requests[0]!.json()).resolves.toEqual({
      jsonrpc: "2.0",
      id: "getHealth",
      method: "getHealth",
    });
  });

  it("unwraps JSON-RPC results with call", async () => {
    const client = new TinyPlaceClient({
      baseUrl: "https://example.test",
      fetch: async () =>
        Response.json({
          jsonrpc: "2.0",
          id: "getSlot",
          result: 123,
        }),
    });

    await expect(client.solana.call<number>("getSlot")).resolves.toBe(123);
  });

  it("throws JSON-RPC errors from call", async () => {
    const client = new TinyPlaceClient({
      baseUrl: "https://example.test",
      fetch: async () =>
        Response.json({
          jsonrpc: "2.0",
          id: "getSlot",
          error: { code: -32005, message: "rate limit" },
        }),
    });

    await expect(client.solana.call("getSlot")).rejects.toThrow(
      "Solana JSON-RPC -32005: rate limit",
    );
  });
});
