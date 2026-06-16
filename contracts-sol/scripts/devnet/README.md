# Devnet deploy + e2e

Deploy the job escrow program to Solana devnet and verify it against the local
build artifact.

The TS SDK has **no** Anchor client for this on-chain program; local integration
coverage lives in `tests/job_escrow.ts`.

## 1. Configure (secrets stay local)

```bash
cp scripts/devnet/.env.devnet.example scripts/devnet/.env.devnet
# edit .env.devnet
```

`.env.devnet` and `scripts/devnet/keys/` are gitignored. **Never** commit them or
paste keys into chat. Each role accepts either a raw private key or a keypair
file:

- `DEPLOYER_PRIVATE_KEY` (base58 or JSON array) **or** `DEPLOYER_KEYPAIR` (file)
- `RELAY_PRIVATE_KEY` **or** `RELAY_KEYPAIR` (optional; else an ephemeral key)
- `TESTER_PRIVATE_KEY` **or** `TESTER_KEYPAIR` (optional; makes your wallet the
  visible job provider)

When you give a private key, the deploy/reclaim scripts write a temp keypair file
just for the solana command and delete it on exit. (Prefer a file? Convert a
base58 secret with a hidden prompt: `node scripts/devnet/from-base58.mjs
scripts/devnet/keys/deployer.json`.)

Required: `DEVNET_RPC_URL`, a deployer key, `USDC_MINT`. Optional: relay key,
tester key, `AMOUNT_BASE`.

The deployer needs SOL for deploy rent, plus a little for transaction fees.

## 2. Deploy (build from source + deploy/upgrade)

```bash
scripts/devnet/deploy.sh              # anchor build, then deploy job_escrow
SKIP_BUILD=1 scripts/devnet/deploy.sh # reuse existing target/deploy/*.so
```

Re-running upgrades in place (same ids, deployer stays upgrade authority).

## 3. Verify

Two different meanings of "verify":

**Bytecode check (local, no extras).** Confirms each deployed program's on-chain
bytes equal your local `target/deploy/<name>.so`, and that the upgrade authority
is the deployer. `deploy.sh` runs this automatically at the end; standalone:

```bash
scripts/devnet/verify.sh    # exit code = number of programs that didn't verify
```

**Verified build (source on Solscan).** Proves the on-chain bytes come from a
public source commit via a reproducible build registered with the OtterSec API
that explorers read. Needs Docker + the source pushed to a public `REPO@COMMIT`.

```bash
# Host (needs `cargo install solana-verify`):
REPO=https://github.com/tinyhumansai/tiny.place COMMIT=<sha> \
  scripts/devnet/verify-build.sh

# Or fully containerized (no host Rust/Solana toolchain — builds a helper image
# the first time, mounts the Docker socket so solana-verify can run its build):
REPO=https://github.com/tinyhumansai/tiny.place COMMIT=<sha> \
  scripts/devnet/docker/run.sh
#   REMOTE=0 to verify locally without submitting; ONLY=job_escrow for one program.
```

The upgrade-authority key (from `.env.devnet`) signs the on-chain verification
record, so it must be the deployer.

## 4. Reclaim rent (when fully done)

```bash
scripts/devnet/reclaim.sh    # PERMANENT: closes deployed programs, refunds rent
```

Closing a program is irreversible — those program ids can never be redeployed.
Only run when you're finished with this deployment.
