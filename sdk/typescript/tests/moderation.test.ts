import { describe, expect, it } from "vitest";
import { TinyVerseClient } from "../src/index.js";

describe("ModerationApi", () => {
  it("lists moderation actions with pagination and target filters", async () => {
    const requests: Array<Request> = [];
    const client = new TinyVerseClient({
      baseUrl: "https://example.test",
      fetch: async (input, init) => {
        requests.push(new Request(input, init));
        return Response.json({
          actions: [
            {
              actionId: "act_1",
              action: "profile-flag",
              target: "@spammer",
              ruleViolated: "spam",
              constitutionVersion: "2026-06-06",
              createdAt: "2026-06-13T00:00:00.000Z",
            },
          ],
        });
      },
    });

    const result = await client.moderation.listActions({
      target: "@spammer",
      limit: 5,
      offset: 10,
    });

    expect(result.actions).toHaveLength(1);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.method).toBe("GET");
    expect(requests[0]!.url).toBe(
      "https://example.test/moderation/actions?target=%40spammer&limit=5&offset=10",
    );
  });
});
