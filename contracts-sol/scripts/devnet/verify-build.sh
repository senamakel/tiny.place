#!/usr/bin/env bash
# VERIFIED BUILD (the kind that shows "Verified" + source on Solscan).
#
# This is different from verify.sh: verify.sh only checks that the on-chain bytes
# equal your LOCAL .so. A *verified build* proves the on-chain bytes come from a
# specific public source commit, by doing a reproducible Docker build and
# registering the result with the OtterSec verified-builds API that Solscan reads.
#
# Requires:
#   - the `solana-verify` CLI   (cargo install solana-verify)
#   - Docker running            (the build happens in a pinned container)
#   - the source pushed to a PUBLIC git commit
#
# Usage:
#   REPO=https://github.com/tinyhumansai/tiny.place \
#   COMMIT=<full-sha> \
#   scripts/devnet/verify-build.sh            # verify + submit all four
#
# Set REMOTE=0 to verify locally without submitting to the public registry.
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
load_env

command -v solana-verify >/dev/null 2>&1 || die "solana-verify not installed (cargo install solana-verify)"
docker info >/dev/null 2>&1 || die "Docker is not running (verified builds run in a container)"
: "${REPO:?set REPO=<public git url>}"
: "${COMMIT:?set COMMIT=<full commit sha that is pushed to REPO>}"

# Path from the repo root down to this Anchor workspace (contracts-sol lives
# inside the frontend submodule/repo).
MOUNT_PATH="${MOUNT_PATH:-frontend/contracts-sol}"
REMOTE_FLAG=""
[ "${REMOTE:-1}" = "1" ] && REMOTE_FLAG="--remote"

for entry in "${PROGRAMS[@]}"; do
  name="${entry%%:*}"; pid="$(program_id "${entry##*:}")"
  echo "==> verifying $name ($pid) against $REPO@$COMMIT"
  solana-verify verify-from-repo "$REPO" \
    --url "$DEVNET_RPC_URL" \
    --program-id "$pid" \
    --library-name "$name" \
    --mount-path "$MOUNT_PATH" \
    --commit-hash "$COMMIT" \
    $REMOTE_FLAG
  echo
done

echo "==> done. Solscan should show 'Verified' for each program within a few minutes."
