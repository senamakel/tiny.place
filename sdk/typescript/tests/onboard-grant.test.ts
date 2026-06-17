import { describe, expect, it } from "vitest";
import {
  canonicalPayload,
  LocalSigner,
  mintOnboardGrant,
  parseOnboardGrant,
  TinyPlaceClient,
} from "../src/index.js";

describe("onboarding bearer grant", () => {
  // Pins the exact bytes the wallet signs. The matching assertion lives in
  // backend/internal/onboardgrant/onboardgrant_test.go (TestCanonicalPayloadContract);
  // if you change either, change both.
  it("produces the cross-language canonical payload", () => {
    const payload = canonicalPayload("onboard.grant", {
      wallet: "Wallet111",
      ownerPublicKey: "OwnerKeyBase64",
      scope: ["user.email.start", "user.profile"],
      expiresAt: "2026-06-17T12:00:00Z",
    });
    expect(payload).toBe(
      '{"action":"onboard.grant","fields":{"expiresAt":"2026-06-17T12:00:00Z","ownerPublicKey":"OwnerKeyBase64","scope":["user.email.start","user.profile"],"wallet":"Wallet111"}}',
    );
  });

  it("mints a grant that round-trips through parseOnboardGrant", async () => {
    const signer = await LocalSigner.fromSeed(new Uint8Array(32).fill(7));
    const credential = await mintOnboardGrant(
      signer,
      signer.publicKeyBase64,
      ["user.profile"],
      15 * 60 * 1000,
    );

    expect(credential.wallet).toBe(signer.agentId);
    expect(credential.grant.startsWith("og1.")).toBe(true);
    expect(credential.authorizationHeader()).toBe(
      `TinyPlace-Onboard ${signer.agentId}:${credential.grant}`,
    );

    const parsed = parseOnboardGrant(credential.fragmentValue());
    expect(parsed?.wallet).toBe(signer.agentId);
    expect(parsed?.grant).toBe(credential.grant);
  });

  it("attaches the bearer header and omits the body signature on onboarding writes", async () => {
    const signer = await LocalSigner.fromSeed(new Uint8Array(32).fill(9));
    const credential = await mintOnboardGrant(
      signer,
      signer.publicKeyBase64,
      ["user.profile"],
      15 * 60 * 1000,
    );

    const requests: Array<Request> = [];
    let bodyText = "";
    // Key-less client: no signer, only the bearer grant.
    const client = new TinyPlaceClient({
      baseUrl: "https://example.test",
      onboardGrant: credential,
      fetch: async (input, init) => {
        const request = new Request(input, init);
        bodyText = (init?.body as string) ?? "";
        requests.push(request);
        return Response.json({
          cryptoId: signer.agentId,
          actorType: "human",
          displayName: "Ada",
          bio: "Updated bio.",
          emailVerified: false,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-02T00:00:00Z",
        });
      },
    });

    await client.users.updateProfile(signer.agentId, { bio: "Updated bio." });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.headers.get("Authorization")).toBe(
      credential.authorizationHeader(),
    );
    const body = JSON.parse(bodyText) as { signature?: string };
    expect(body.signature).toBeUndefined();
  });

  it("rejects malformed fragment values", () => {
    expect(parseOnboardGrant("")).toBeUndefined();
    expect(parseOnboardGrant("nowallet")).toBeUndefined();
    expect(parseOnboardGrant("Wallet:not-a-grant")).toBeUndefined();
  });
});
