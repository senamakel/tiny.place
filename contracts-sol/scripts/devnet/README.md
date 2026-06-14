# Devnet deploy + e2e

Deploy the custody/settlement programs to Solana devnet and run a full
round-trip of every settlement mode against them with real (test) USDC.

The TS SDK has **no** Anchor client for these on-chain programs, so the e2e
drives them directly through their IDLs (`target/idl/*.json`).

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
  visible job provider + poker/lottery winner)

When you give a private key, the deploy/reclaim scripts write a temp keypair file
just for the solana command and delete it on exit. (Prefer a file? Convert a
base58 secret with a hidden prompt: `node scripts/devnet/from-base58.mjs
scripts/devnet/keys/deployer.json`.)

Required: `DEVNET_RPC_URL`, a deployer key, `USDC_MINT`. Optional: relay key,
tester key, `AMOUNT_BASE`.

The deployer needs **~7+ SOL** (deploy rent for all four ~250 KB programs, all
recoverable) plus a little for test fees, and some **test USDC** for the e2e.

## 2. Deploy (build from source + deploy/upgrade)

```bash
scripts/devnet/deploy.sh              # anchor build, then deploy all four
SKIP_BUILD=1 scripts/devnet/deploy.sh # reuse existing target/deploy/*.so
```

Re-running upgrades in place (same ids, deployer stays upgrade authority).

## 3. Test

```bash
NODE_OPTIONS=--no-experimental-strip-types \
  yarn ts-mocha -p ./tsconfig.json -t 1000000 scripts/devnet/e2e.devnet.ts
```

Covers: escrow x402 deposit; job fund→deliver→approve (rake); poker join×2→settle
(winner takes pot minus rake); lottery buy×2→begin_draw→settle_winner→finalize.
Each run uses fresh, timestamped vault/record ids so it's safely repeatable.

## 3b. Verify

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
#   REMOTE=0 to verify locally without submitting; ONLY=escrow for one program.
```

The upgrade-authority key (from `.env.devnet`) signs the on-chain verification
record, so it must be the deployer.

## 4. Reclaim rent (when fully done)

```bash
scripts/devnet/reclaim.sh    # PERMANENT: closes all four programs, refunds rent
```

Closing a program is irreversible — those program ids can never be redeployed.
Only run when you're finished with this deployment.
