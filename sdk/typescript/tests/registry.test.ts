import { describe, expect, it } from "vitest";
import { canonicalPayload, LocalSigner, TinyVerseClient } from "../src/index.js";

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

describe("RegistryApi", () => {
  it("signs profile visibility updates with null omitted fields", async () => {
    const signer = await LocalSigner.fromSeed(new Uint8Array(32).fill(16));
    const requests: Array<Request> = [];
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      signer,
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({
          activity: false,
          groups: true,
          broadcasts: true,
          attestations: true,
          agentCard: true,
          searchEngineIndexing: false,
        });
      },
    });

    await client.registry.updateProfileVisibility("@agent", {
      activity: false,
      searchEngineIndexing: false,
    });

    expect(requests).toHaveLength(1);
    const request = requests[0]!;
    expect(request.method).toBe("PUT");
    expect(request.url).toBe(
      "https://example.test/registry/names/%40agent/profile-visibility",
    );

    const body = (await request.json()) as {
      activity: boolean;
      agentCard?: boolean;
      attestations?: boolean;
      broadcasts?: boolean;
      groups?: boolean;
      searchEngineIndexing: boolean;
      signature: string;
    };
    expect(body).toMatchObject({
      activity: false,
      searchEngineIndexing: false,
    });
    expect(body.signature).toBeTruthy();

    const publicKey = await globalThis.crypto.subtle.importKey(
      "raw",
      signer.publicKey,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const ok = await globalThis.crypto.subtle.verify(
      "Ed25519",
      publicKey,
      fromBase64(body.signature),
      new TextEncoder().encode(
        canonicalPayload("identity.profile_visibility", {
          activity: false,
          agentCard: null,
          attestations: null,
          broadcasts: null,
          groups: null,
          searchEngineIndexing: false,
          username: "@agent",
        }),
      ),
    );
    expect(ok).toBe(true);
  });
});
