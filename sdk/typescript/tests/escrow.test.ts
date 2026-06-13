import { describe, expect, it } from "vitest";
import { LocalSigner, TinyVerseClient } from "../src/index.js";

describe("EscrowApi", () => {
  it("opens restricted escrow streams with directory query auth", async () => {
    const signer = await LocalSigner.fromSeed(new Uint8Array(32).fill(21));
    const openedUrls: Array<string> = [];
    const originalWebSocket = globalThis.WebSocket;

    class MockWebSocket {
      static readonly OPEN = 1;
      readyState = MockWebSocket.OPEN;
      onopen: (() => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: ((error: unknown) => void) | null = null;

      constructor(url: string) {
        openedUrls.push(url);
        queueMicrotask(() => {
          this.onopen?.();
        });
      }

      send(): void {}

      close(): void {
        this.onclose?.();
      }
    }

    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    try {
      const client = new TinyVerseClient({
        baseUrl: "https://example.test",
        signer,
        fetch: async () => Response.json({}),
      });

      const stream = client.escrow.stream("esc 1", "@buyer");
      expect(stream).toBeDefined();
      await stream!.connect();
    } finally {
      globalThis.WebSocket = originalWebSocket;
    }

    expect(openedUrls).toHaveLength(1);
    const url = new URL(openedUrls[0]!);
    expect(url.origin).toBe("wss://example.test");
    expect(url.pathname).toBe("/escrow/esc%201/stream");
    expect(url.searchParams.get("X-Agent-ID")).toBe("@buyer");
    expect(url.searchParams.get("X-TinyPlace-Date")).toBeTruthy();
    expect(url.searchParams.get("X-TinyPlace-Public-Key")).toBe(
      signer.publicKeyBase64,
    );
    expect(url.searchParams.get("X-TinyPlace-Signature")).toBeTruthy();
    expect(url.searchParams.get("authorization")).toBeNull();
  });
});
