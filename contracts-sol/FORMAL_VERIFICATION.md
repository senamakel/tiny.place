# Formal Verification - tiny.place job escrow contract

This document tracks the safety invariants for the active on-chain program:
`programs/job_escrow`.

`job_escrow` owns both custody and job settlement. It creates the job record,
creates the job token vault, accepts replay-protected funding, and settles the
job lifecycle without a separate game, lottery, escrow, or settlement program.

## Approach

Money-handling arithmetic is extracted into pure functions in
`programs/job_escrow/src/math.rs` so it can be tested and fuzzed outside the
Solana runtime. Runtime-only properties such as PDA ownership, signer checks,
token account constraints, and state transitions are covered by the Anchor
integration suite in `tests/job_escrow.ts`.

## Status

Last verified on the Anchor 1.0.2 / Solana 3.1.10 toolchain:

- **cargo-fuzz:** `disburse` and `rake` targets cover custody solvency and job
  settlement conservation.
- **cargo test:** host unit tests cover the pure math helpers.
- **anchor test:** integration tests exercise `create_job`, `fund`, `fund_for`,
  `mark_delivered`, `approve`, `dispute`, `resolve`, `refund`, nonce replay,
  expiry, payer matching, authority checks, and fee-account mint checks.

## Running

```bash
cd contracts-sol
cargo test
cargo +nightly fuzz run disburse
cargo +nightly fuzz run rake
anchor build --ignore-keys
anchor test
```

`--ignore-keys` is required when building with the checked-in source id because
`job_escrow` intentionally reuses the previous escrow program id.

## Invariants

| ID | Invariant | Enforcement | Test |
| --- | --- | --- | --- |
| J1 Solvency | `disbursed` never exceeds `deposited`; each release is bounded by `deposited - disbursed`. | `math::apply_disburse` and settlement handlers. | `disburse` fuzz target; approval/resolve/refund Anchor tests. |
| J2 Replay safety | A funding nonce is accepted only if strictly greater than the payer's last nonce. | `math::nonce_ok` and the nonce tracker PDA. | `funds with x402 nonce protection...`. |
| J3 Delegated funding scope | `fund_for` can fund only the intended job, payer, mint, vault, amount, and nonce window. | Instruction data plus account constraints. | `lets a session delegate fund the job...`. |
| J4 Fee bound | `fee <= available` and refunds take no fee. | `math::rake`; `fee_bps < 10_000` at job creation. | `approve`, `resolve`, and `refund` Anchor tests. |
| J5 State machine | Only the provider delivers, only the client approves/refunds, and only the controller resolves disputes. | Per-handler state and actor checks. | Unauthorized actor and lifecycle Anchor tests. |
| J6 Vault isolation | The vault token account is derived from and pinned to the job account. | PDA seeds plus token account constraints. | Job creation and settlement Anchor tests. |
