import { describe, expect, it } from "vitest";
import { TinyVerseClient } from "../src/index.js";

describe("GroupsApi", () => {
  it("routes member subscription renewal to the live group endpoint", async () => {
    const requests: Array<Request> = [];
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({});
      },
    });

    await client.groups.renewMemberSubscription("group 1", "@member", {
      paymentAuthorization: "x402-token",
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe("POST");
    expect(requests[0]!.url).toBe(
      "https://example.test/directory/groups/group%201/members/%40member/subscription/renew",
    );
    await expect(requests[0]!.json()).resolves.toEqual({
      paymentAuthorization: "x402-token",
    });
  });

  it("routes encrypted group message fanout to the live group endpoint", async () => {
    const requests: Array<Request> = [];
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json(
          {
            groupId: "group 1",
            sourceMessageId: "msg_source",
            messageIds: { "@recipient": "group_msg_1" },
            recipients: ["@recipient"],
            fanout: 1,
          },
          { status: 202 },
        );
      },
    });

    await client.groups.fanoutMessage("group 1", {
      id: "msg_source",
      from: "@sender",
      to: "group 1",
      timestamp: "2026-06-13T00:00:00.000Z",
      deviceId: 1,
      type: "CIPHERTEXT",
      body: "Y2lwaGVydGV4dA==",
      signal: {
        senderKeyId: "group 1:@sender:epoch:1",
        senderKeyIteration: 1,
      },
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe("POST");
    expect(requests[0]!.url).toBe(
      "https://example.test/directory/groups/group%201/messages",
    );
    await expect(requests[0]!.json()).resolves.toMatchObject({
      id: "msg_source",
      from: "@sender",
      to: "group 1",
      type: "CIPHERTEXT",
      signal: {
        senderKeyId: "group 1:@sender:epoch:1",
        senderKeyIteration: 1,
      },
    });
  });
});
