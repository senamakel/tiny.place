#!/usr/bin/env bash
# Reclaim devnet deploy rent by CLOSING the programs and any leftover buffers.
#
#   scripts/devnet/reclaim.sh           # interactive confirm, then close all 4
#   FORCE=1 scripts/devnet/reclaim.sh   # no prompt
#
# WARNING: closing a program is PERMANENT. The program id can never be redeployed
# (a fresh deploy needs new keypairs / ids). Only run this when you are fully done
# with this deployment. Rent (~7 SOL) is returned to the deployer.
set -euo pipefail
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lib.sh"
load_env

echo "This will PERMANENTLY close these programs and refund rent to $DEPLOYER_PUBKEY:"
for entry in "${PROGRAMS[@]}"; do echo "    ${entry%%:*}  ->  $(program_id "${entry##*:}")"; done
echo "Program ids become unusable forever (redeploy needs new ids)."
echo

if [ "${FORCE:-0}" != "1" ]; then
  read -r -p 'Type "close" to proceed: ' confirm
  [ "$confirm" = "close" ] || die "aborted"
fi

echo "==> balance before: $(sol_balance) SOL"

for entry in "${PROGRAMS[@]}"; do
  name="${entry%%:*}"; pid="$(program_id "${entry##*:}")"
  if solana program show "$pid" --url "$DEVNET_RPC_URL" >/dev/null 2>&1; then
    echo "==> closing $name ($pid)"
    solana program close "$pid" \
      --recipient "$DEPLOYER_PUBKEY" \
      --keypair "$DEPLOYER_KEYPAIR" \
      --url "$DEVNET_RPC_URL" \
      --bypass-warning
  else
    echo "==> $name ($pid) not deployed; skipping"
  fi
done

# Reclaim rent stuck in abandoned buffer accounts from any failed/partial deploys.
echo "==> closing leftover deploy buffers owned by $DEPLOYER_PUBKEY"
solana program close --buffers \
  --keypair "$DEPLOYER_KEYPAIR" \
  --url "$DEVNET_RPC_URL" \
  --bypass-warning || true

echo "==> balance after: $(sol_balance) SOL"
