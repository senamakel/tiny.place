#!/usr/bin/env bash
# Verify already-deployed programs on devnet WITHOUT deploying anything:
#   - each program exists and is executable
#   - its upgrade authority is the deployer
#   - the on-chain bytecode matches the local target/deploy/<name>.so
#
#   scripts/devnet/verify.sh
#
# Exit status is the number of programs that failed verification (0 = all good),
# so it doubles as a CI gate.
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
load_env

echo "==> deployer : $DEPLOYER_PUBKEY"
echo "==> rpc      : $DEVNET_RPC_URL"
echo
verify_all
