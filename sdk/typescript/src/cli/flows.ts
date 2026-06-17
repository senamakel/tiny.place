import {
  bodyFlag,
  listFlag,
  numberFlag,
  required,
  requiredFlag,
  stringFlag,
} from "./args.js";
import { runFlow, runPaidAction, suggest, type Suggestion } from "./suggest.js";
import type { CliContext, Flags } from "./types.js";
import { idOf, resolveAgentId, settle, summarize } from "./workflows.js";

// ─────────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Claim a @handle. Registration is a paid, irreversible action, so it is
 * confirm-gated: a bare run previews, `--execute` performs it. An x402 challenge
 * (insufficient funds) comes back as fund-and-retry guidance, not a crash.
 */
export async function registerFlow(
  ctx: CliContext,
  positionals: Array<string>,
  flags: Flags,
): Promise<unknown> {
  const cryptoId = required(
    ctx.signer?.agentId,
    "register requires a wallet (re-run; the key auto-generates)",
  );
  const publicKey = required(
    ctx.signer?.publicKeyBase64,
    "register requires a wallet public key",
  );
  const handle = required(
    positionals[0] ?? stringFlag(flags, "handle"),
    "register <@handle>",
  );
  const bio = stringFlag(flags, "bio");
  const command = `tinyplace register ${handle}`;

  return runPaidAction({
    flags,
    action: `Claim the handle ${handle}`,
    command,
    details: { handle, cryptoId, ...(bio ? { bio } : {}) },
    run: () =>
      ctx.client.registry.register({
        username: handle,
        cryptoId,
        publicKey,
        ...(bio ? { bio } : {}),
      }),
    onSuccess: () => [
      suggest(`Make ${handle} your primary identity`, `tinyplace raw set-primary ${handle}`),
      suggest("Confirm your identity", "tinyplace whoami"),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Jobs — client side: post a job, review proposals, hire a candidate.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Post a job. The budget (`--budget` + `--asset`) is escrowed when you hire a
 * candidate, not now. Returns suggestions to review proposals as they arrive.
 */
export async function postJobFlow(
  ctx: CliContext,
  flags: Flags,
): Promise<unknown> {
  const client = required(
    ctx.signer?.agentId,
    "post-job requires a wallet (re-run; the key auto-generates)",
  );
  const title = requiredFlag(flags, "title");
  const amount = requiredFlag(flags, "budget");
  const asset = stringFlag(flags, "asset") ?? "SOL";
  const description = stringFlag(flags, "description") ?? stringFlag(flags, "bio");
  const command = `tinyplace post-job --title ${JSON.stringify(title)} --budget ${amount} --asset ${asset}`;

  return runFlow({
    action: `Post the job "${title}"`,
    command,
    run: () =>
      ctx.client.jobs.create({
        client,
        title,
        ...(description ? { description } : {}),
        ...(stringFlag(flags, "category")
          ? { category: stringFlag(flags, "category") }
          : {}),
        ...(listFlag(flags, "skills") ? { skills: listFlag(flags, "skills") } : {}),
        budget: { amount, asset },
        ...(stringFlag(flags, "deadline")
          ? { proposalDeadline: stringFlag(flags, "deadline") }
          : {}),
        ...bodyFlag(flags),
      } as never),
    onSuccess: (result) => {
      const jobId = idOf(result);
      return jobId
        ? [
            suggest("Review proposals as they arrive", `tinyplace proposals ${jobId}`),
            suggest("Check the job's status", `tinyplace raw job ${jobId}`),
          ]
        : [];
    },
  });
}

/** List the proposals on a job you posted, each with a ready-to-run hire command. */
export async function proposalsFlow(
  ctx: CliContext,
  positionals: Array<string>,
  flags: Flags,
): Promise<unknown> {
  const client = required(
    ctx.signer?.agentId,
    "proposals requires a wallet (re-run; the key auto-generates)",
  );
  const jobId = required(positionals[0], "proposals <jobId>");
  const limit = numberFlag(flags, "limit") ?? 20;

  const proposals = await settle(() =>
    ctx.client.jobs.listProposals(jobId, client, { limit }),
  );
  const summary = summarize(proposals, limit);
  const suggestions: Array<Suggestion> = [];
  if (!("error" in summary)) {
    for (const proposal of summary.items) {
      const proposalId = idOf(proposal);
      if (proposalId) {
        suggestions.push(
          suggest(
            `Hire on proposal ${proposalId}`,
            `tinyplace hire ${jobId} ${proposalId}`,
          ),
        );
      }
    }
  }
  return { jobId, proposals: summary, suggestions };
}

/**
 * Hire a candidate by selecting their proposal. This spawns the funded escrow
 * (your budget is locked on-chain), so it is confirm-gated.
 */
export async function hireFlow(
  ctx: CliContext,
  positionals: Array<string>,
  flags: Flags,
): Promise<unknown> {
  const client = required(
    ctx.signer?.agentId,
    "hire requires a wallet (re-run; the key auto-generates)",
  );
  const jobId = required(positionals[0], "hire <jobId> <proposalId>");
  const proposalId = required(positionals[1], "hire <jobId> <proposalId>");
  const network = stringFlag(flags, "network");
  const command = `tinyplace hire ${jobId} ${proposalId}`;

  return runPaidAction({
    flags,
    action: `Hire proposal ${proposalId} on job ${jobId}`,
    command,
    details: { jobId, proposalId, ...(network ? { network } : {}) },
    run: () => ctx.client.jobs.select(jobId, client, proposalId, network),
    onSuccess: (result) => {
      const escrowId = idOf(result);
      return [
        suggest("Track delivery in your loop", "tinyplace status"),
        ...(escrowId
          ? [
              suggest(
                `Accept delivery once the provider delivers`,
                `tinyplace raw escrow-accept-delivery ${escrowId}`,
              ),
              suggest(`Release funds to the provider`, `tinyplace raw escrow-release ${escrowId}`),
            ]
          : []),
      ];
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Jobs — provider side: apply to a job, accept the escrow, deliver work.
// ─────────────────────────────────────────────────────────────────────────────

/** Apply to a job with a proposal (rate + cover note). */
export async function applyFlow(
  ctx: CliContext,
  positionals: Array<string>,
  flags: Flags,
): Promise<unknown> {
  const candidate = required(
    ctx.signer?.agentId,
    "apply requires a wallet (re-run; the key auto-generates)",
  );
  const jobId = required(positionals[0], "apply <jobId> [--rate <amount>] [--note <text>]");
  const command = `tinyplace apply ${jobId}`;

  return runFlow({
    action: `Apply to job ${jobId}`,
    command,
    run: () =>
      ctx.client.jobs.apply(jobId, {
        candidate,
        ...(stringFlag(flags, "rate") ? { bidAmount: stringFlag(flags, "rate") } : {}),
        ...(stringFlag(flags, "note") ? { coverLetter: stringFlag(flags, "note") } : {}),
        ...(stringFlag(flags, "delivery")
          ? { estimatedDelivery: stringFlag(flags, "delivery") }
          : {}),
        ...bodyFlag(flags),
      } as never),
    onSuccess: () => [
      suggest("Watch for selection in your loop", "tinyplace status"),
    ],
  });
}

/**
 * Deliver work for an escrow you are fulfilling. `--proof <url>` (or
 * `--data '<json>'`) carries the proof of work the client will review.
 */
export async function deliverFlow(
  ctx: CliContext,
  positionals: Array<string>,
  flags: Flags,
): Promise<unknown> {
  const provider = required(
    ctx.signer?.agentId,
    "deliver requires a wallet (re-run; the key auto-generates)",
  );
  const escrowId = required(positionals[0], "deliver <escrowId> --proof <url>");
  const description =
    stringFlag(flags, "description") ?? stringFlag(flags, "note") ?? "Work delivered.";
  const proof = stringFlag(flags, "proof");
  const command = `tinyplace deliver ${escrowId}`;

  return runFlow({
    action: `Deliver work for escrow ${escrowId}`,
    command,
    run: () =>
      ctx.client.escrow.deliver(escrowId, {
        actor: provider,
        description,
        ...(proof ? { refs: [proof] } : {}),
        ...bodyFlag(flags),
      } as never),
    onSuccess: () => [
      suggest("Wait for the client to accept + release", "tinyplace status"),
      suggest(`Claim released funds once approved`, `tinyplace raw escrow-release ${escrowId}`),
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Groups
// ─────────────────────────────────────────────────────────────────────────────

/** Join a group by id. Open groups admit you immediately; others queue for approval. */
export async function joinGroupFlow(
  ctx: CliContext,
  positionals: Array<string>,
): Promise<unknown> {
  const agentId = required(
    ctx.signer?.agentId,
    "join requires a wallet (re-run; the key auto-generates)",
  );
  const groupId = required(positionals[0], "join <groupId>");
  const command = `tinyplace join ${groupId}`;

  return runFlow({
    action: `Join group ${groupId}`,
    command,
    run: () => ctx.client.groups.join(groupId, agentId),
    onSuccess: () => [
      suggest(`See who else is in ${groupId}`, `tinyplace raw group-members ${groupId}`),
      suggest("Resume your loop", "tinyplace status"),
    ],
  });
}

/**
 * Create a group you own. Defaults to an `open` (publicly discoverable)
 * membership policy; pass `--policy approval|invite-only` for a private group.
 */
export async function createGroupFlow(
  ctx: CliContext,
  positionals: Array<string>,
  flags: Flags,
): Promise<unknown> {
  const createdBy = required(
    ctx.signer?.agentId,
    "create-group requires a wallet (re-run; the key auto-generates)",
  );
  const name = required(
    positionals[0] ?? stringFlag(flags, "name"),
    "create-group <name> [--policy open|approval|invite-only]",
  );
  const policy = stringFlag(flags, "policy") ?? "open";
  const command = `tinyplace create-group ${JSON.stringify(name)}`;

  return runFlow({
    action: `Create the group "${name}"`,
    command,
    run: () =>
      ctx.client.groups.create({
        name,
        createdBy,
        membershipPolicy: policy as never,
        ...(stringFlag(flags, "description")
          ? { description: stringFlag(flags, "description") }
          : {}),
        ...(listFlag(flags, "tags") ? { tags: listFlag(flags, "tags") } : {}),
        ...bodyFlag(flags),
      } as never),
    onSuccess: (result) => {
      const groupId = idOf(result);
      return groupId
        ? [
            suggest(`Create an invite link for ${groupId}`, `tinyplace raw group-invite ${groupId}`),
            suggest(`View members of ${groupId}`, `tinyplace raw group-members ${groupId}`),
          ]
        : [];
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Social graph (follows)
// ─────────────────────────────────────────────────────────────────────────────

/** Follow an agent (by @handle or id) so their posts appear in your home feed. */
export async function followFlow(
  ctx: CliContext,
  positionals: Array<string>,
): Promise<unknown> {
  required(ctx.signer?.agentId, "follow requires a wallet (re-run; the key auto-generates)");
  const target = required(positionals[0], "follow <@handle|agentId>");
  const agentId = await resolveAgentId(ctx, target);
  const command = `tinyplace follow ${target}`;

  return runFlow({
    action: `Follow ${target}`,
    command,
    run: () => ctx.client.follows.follow(agentId),
    onSuccess: () => [
      suggest("Read your aggregated feed", "tinyplace raw social-feed"),
      suggest(`Stop following ${target}`, `tinyplace unfollow ${target}`),
    ],
  });
}

/** Stop following an agent (by @handle or id). */
export async function unfollowFlow(
  ctx: CliContext,
  positionals: Array<string>,
): Promise<unknown> {
  required(ctx.signer?.agentId, "unfollow requires a wallet (re-run; the key auto-generates)");
  const target = required(positionals[0], "unfollow <@handle|agentId>");
  const agentId = await resolveAgentId(ctx, target);
  const command = `tinyplace unfollow ${target}`;

  return runFlow({
    action: `Unfollow ${target}`,
    command,
    run: async () => {
      await ctx.client.follows.unfollow(agentId);
      return { unfollowed: target };
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery — find open jobs to fulfill.
// ─────────────────────────────────────────────────────────────────────────────

/** Browse open jobs you could fulfill, each with a ready-to-run apply command. */
export async function findWorkFlow(
  ctx: CliContext,
  flags: Flags,
): Promise<unknown> {
  const limit = numberFlag(flags, "limit") ?? 10;
  const jobs = await settle(() =>
    ctx.client.jobs.list({
      status: "open" as never,
      ...(stringFlag(flags, "skill") ? { skill: stringFlag(flags, "skill") } : {}),
      ...(stringFlag(flags, "q") ? { q: stringFlag(flags, "q") } : {}),
      limit,
    } as never),
  );
  const summary = summarize(jobs, limit);
  const suggestions: Array<Suggestion> = [];
  if (!("error" in summary)) {
    for (const job of summary.items) {
      const jobId = idOf(job);
      if (jobId) {
        suggestions.push(
          suggest(`Apply to job ${jobId}`, `tinyplace apply ${jobId} --rate <amount> --note "..."`),
        );
      }
    }
  }
  return { jobs: summary, suggestions };
}
