#!/usr/bin/env bash
# Run a Solana VERIFIED BUILD for each program inside Docker (no host Rust/Solana
# toolchain needed). Builds the helper image once, then runs solana-verify with
# the host Docker socket mounted so it can launch the pinned reproducible-build
# container.
#
# This is the "show Verified + source on Solscan" path. It needs:
#   - Docker running
#   - the source pushed to a PUBLIC git commit (REPO@COMMIT)
#   - the program's upgrade authority key (to register the verification PDA);
#     taken from .env.devnet (DEPLOYER_PRIVATE_KEY / *_KEYPAIR)
#
# Usage:
#   REPO=https://github.com/tinyhumansai/tiny.place COMMIT=<full-sha> \
#     scripts/devnet/docker/run.sh
#
#   REMOTE=0 ...   verify locally only (do not submit to the public registry)
#   ONLY=escrow ... verify a single program
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$HERE/../lib.sh"
load_env

docker info >/dev/null 2>&1 || die "Docker is not running"
: "${REPO:?set REPO=<public git url>}"
: "${COMMIT:?set COMMIT=<full commit sha pushed to REPO>}"

# Repo root (frontend) so the build container can mount the workspace at a path
# that matches the host — required for docker-out-of-docker volume mounts.
REPO_ROOT="$(git -C "$CONTRACTS_DIR" rev-parse --show-toplevel)"
MOUNT_PATH="${MOUNT_PATH:-frontend/contracts-sol}"
IMAGE="${IMAGE:-tinyplace-solana-verify}"
REMOTE_FLAG=""; [ "${REMOTE:-1}" = "1" ] && REMOTE_FLAG="--remote"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "==> building $IMAGE (first run compiles solana-verify; this is slow)"
  docker build -t "$IMAGE" "$HERE"
fi

for entry in "${PROGRAMS[@]}"; do
  name="${entry%%:*}"; pid="$(program_id "${entry##*:}")"
  [ -n "${ONLY:-}" ] && [ "$ONLY" != "$name" ] && continue
  echo "==> verifying $name ($pid) against $REPO@$COMMIT"
  docker run --rm \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v "$REPO_ROOT:$REPO_ROOT" \
    -v "$DEPLOYER_KEYPAIR:/work/authority.json:ro" \
    -w "$REPO_ROOT/contracts-sol" \
    "$IMAGE" \
    verify-from-repo "$REPO" \
      --url "$DEVNET_RPC_URL" \
      --program-id "$pid" \
      --library-name "$name" \
      --mount-path "$MOUNT_PATH" \
      --commit-hash "$COMMIT" \
      --keypair /work/authority.json \
      $REMOTE_FLAG
  echo
done

echo "==> done. Solscan should show 'Verified' for each program within a few minutes."
