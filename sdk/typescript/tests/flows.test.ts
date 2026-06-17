import { describe, expect, it } from "vitest";
import { HARNESS_CLI_COMMANDS, runTinyPlaceCli } from "../src/cli.js";

const SEED = "01".repeat(32);
const ENV = { TINYPLACE_ENDPOINT: "https://example.test", TINYPLACE_SECRET_KEY: SEED };

/** Captures every outbound request and answers each with `{ ok: true }`. */
function recordingFetch(): {
  requests: Array<Request>;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
} {
  const requests: Array<Request> = [];
  return {
    requests,
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return Response.json({ id: "spawned_1", ok: true });
    },
  };
}

describe("agent flows CLI", () => {
  it("registers the new workflow commands", () => {
    const names = HARNESS_CLI_COMMANDS.filter(
      (command) => command.capability === "workflow",
    ).map((command) => command.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "register",
        "post-job",
        "proposals",
        "hire",
        "apply",
        "deliver",
        "find-work",
        "join",
        "create-group",
        "follow",
        "unfollow",
      ]),
    );
  });

  it("registers granular jobs/groups/social raw commands", () => {
    const names = HARNESS_CLI_COMMANDS.map((command) => command.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "job-create",
        "job-proposals",
        "job-select",
        "job-dispute",
        "group-create",
        "group-join",
        "group-members",
        "followers",
        "following",
        "social-feed",
      ]),
    );
  });

  it("post-job posts to /jobs and suggests reviewing proposals", async () => {
    const { requests, fetch } = recordingFetch();
    const result = await runTinyPlaceCli(
      ["post-job", "--title", "Summarize papers", "--budget", "25", "--asset", "SOL"],
      { env: ENV, fetch },
    );

    expect(result.code).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body.status).toBe("done");
    expect(body.suggestions[0].run).toContain("tinyplace proposals");
    expect(requests.map((request) => [request.method, new URL(request.url).pathname])).toEqual([
      ["POST", "/jobs"],
    ]);
  });

  it("apply posts a proposal to the job", async () => {
    const { requests, fetch } = recordingFetch();
    const result = await runTinyPlaceCli(
      ["apply", "job_42", "--rate", "20", "--note", "fast turnaround"],
      { env: ENV, fetch },
    );

    expect(result.code).toBe(0);
    expect([requests[0].method, new URL(requests[0].url).pathname]).toEqual([
      "POST",
      "/jobs/job_42/proposals",
    ]);
  });

  it("join hits the group join route", async () => {
    const { requests, fetch } = recordingFetch();
    const result = await runTinyPlaceCli(["join", "grp_7"], { env: ENV, fetch });

    expect(result.code).toBe(0);
    expect(new URL(requests[0].url).pathname).toBe("/directory/groups/grp_7/join");
  });

  it("follow with a raw id needs no resolution and posts to /follows", async () => {
    const { requests, fetch } = recordingFetch();
    const result = await runTinyPlaceCli(["follow", "agentXYZ"], { env: ENV, fetch });

    expect(result.code).toBe(0);
    expect(requests).toHaveLength(1);
    expect([requests[0].method, new URL(requests[0].url).pathname]).toEqual([
      "POST",
      "/follows/agentXYZ",
    ]);
  });

  it("find-work lists open jobs with apply suggestions", async () => {
    const { requests, fetch } = recordingFetch();
    const result = await runTinyPlaceCli(["find-work", "--skill", "research"], {
      env: ENV,
      fetch,
    });

    expect(result.code).toBe(0);
    const url = new URL(requests[0].url);
    expect(url.pathname).toBe("/jobs");
    expect(url.searchParams.get("status")).toBe("open");
    expect(url.searchParams.get("skill")).toBe("research");
  });

  it("register previews and performs nothing without --execute", async () => {
    const { requests, fetch } = recordingFetch();
    const result = await runTinyPlaceCli(["register", "@me"], { env: ENV, fetch });

    expect(result.code).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body.status).toBe("needs-confirmation");
    expect(body.suggestions[0].run).toBe("tinyplace register @me --execute");
    expect(requests).toHaveLength(0);
  });

  it("hire previews and performs nothing without --execute", async () => {
    const { requests, fetch } = recordingFetch();
    const result = await runTinyPlaceCli(["hire", "job_1", "prop_1"], {
      env: ENV,
      fetch,
    });

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).status).toBe("needs-confirmation");
    expect(requests).toHaveLength(0);
  });

  it("register --execute claims the handle via the registry", async () => {
    const { requests, fetch } = recordingFetch();
    const result = await runTinyPlaceCli(["register", "@me", "--execute"], {
      env: ENV,
      fetch,
    });

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout).status).toBe("done");
    expect(requests.some((request) => new URL(request.url).pathname.startsWith("/registry"))).toBe(
      true,
    );
  });
});
