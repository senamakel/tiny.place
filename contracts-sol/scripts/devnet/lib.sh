#!/usr/bin/env bash
# Shared helpers for the devnet deploy/reclaim scripts. Source this, don't run it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env.devnet}"
KEYS_DIR="$SCRIPT_DIR/keys"

# Make sure the solana toolchain is on PATH (covers the common install location).
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# The four programs, in dependency order (escrow first — settlement programs CPI
# into it). Format: "<name>:<keypair-path>".
PROGRAMS=(
  "escrow:$CONTRACTS_DIR/target/deploy/escrow-keypair.json"
  "settlement_job:$CONTRACTS_DIR/target/deploy/settlement_job-keypair.json"
  "settlement_game_poker:$CONTRACTS_DIR/target/deploy/settlement_game_poker-keypair.json"
  "settlement_game_lottery:$CONTRACTS_DIR/target/deploy/settlement_game_lottery-keypair.json"
)

die() { echo "ERROR: $*" >&2; exit 1; }

# Temp keypair files materialized from raw private keys are deleted on exit.
TMP_KEYS=()
cleanup_tmp_keys() { for f in "${TMP_KEYS[@]:-}"; do [ -n "${f:-}" ] && rm -f "$f"; done; }
trap cleanup_tmp_keys EXIT

# Resolve a signing role to a keypair FILE the solana CLI can use. Prefers a raw
# private key (`<ROLE>_PRIVATE_KEY`, base58 or JSON array) which it writes to a
# gitignored temp file; otherwise a keypair file path (`<ROLE>_KEYPAIR`). Echoes
# the resolved path.
resolve_signer() {
  local role="$1"
  local pk_var="${role}_PRIVATE_KEY" file_var="${role}_KEYPAIR"
  local pk="${!pk_var:-}" file="${!file_var:-}"
  if [ -n "$pk" ]; then
    mkdir -p "$KEYS_DIR"
    local lower out
    lower="$(printf '%s' "$role" | tr '[:upper:]' '[:lower:]')"
    out="$KEYS_DIR/.${lower}.$$.tmp"
    SECRET="$pk" node "$SCRIPT_DIR/secret-to-keypair.mjs" "$out" >/dev/null \
      || die "could not parse ${pk_var} (expected base58 or JSON array secret key)"
    TMP_KEYS+=("$out")
    echo "$out"
  elif [ -n "$file" ]; then
    case "$file" in /*) echo "$file";; *) echo "$CONTRACTS_DIR/$file";; esac
  else
    die "set ${role}_PRIVATE_KEY or ${role}_KEYPAIR in $ENV_FILE"
  fi
}

load_env() {
  [ -f "$ENV_FILE" ] || die "missing $ENV_FILE (copy .env.devnet.example and fill it in)"
  set -a; . "$ENV_FILE"; set +a
  : "${DEVNET_RPC_URL:?set DEVNET_RPC_URL in $ENV_FILE}"
  DEPLOYER_KEYPAIR="$(resolve_signer DEPLOYER)"
  [ -f "$DEPLOYER_KEYPAIR" ] || die "deployer keypair could not be resolved"
  DEPLOYER_PUBKEY="$(solana-keygen pubkey "$DEPLOYER_KEYPAIR")"
}

sol_balance() { solana balance "$DEPLOYER_PUBKEY" --url "$DEVNET_RPC_URL" 2>/dev/null || echo "?"; }

program_id() { solana-keygen pubkey "$1"; }

# Verify one deployed program: that it exists + is executable, that its upgrade
# authority is the deployer, and that the ON-CHAIN bytecode matches the local
# build artifact (sha256 of the local .so vs the on-chain dump, trimmed to the
# .so length to ignore the loader's trailing zero padding). Returns nonzero on
# any failure so callers can aggregate a pass/fail.
verify_program() {
  local name="$1" keypair="$2"
  local pid so info auth tmp n local_hash chain_hash rc=0
  pid="$(program_id "$keypair")"
  so="$CONTRACTS_DIR/target/deploy/$name.so"

  if ! info="$(solana program show "$pid" --url "$DEVNET_RPC_URL" 2>&1)"; then
    echo "  [$name] $pid  -> NOT DEPLOYED"
    return 1
  fi
  echo "  [$name] $pid"

  auth="$(printf '%s\n' "$info" | awk -F': *' '/^Authority/{print $2; exit}')"
  if [ "$auth" = "$DEPLOYER_PUBKEY" ]; then
    echo "      authority : OK (deployer)"
  else
    echo "      authority : $auth  (NOT the deployer!)"; rc=1
  fi

  local dlen
  dlen="$(printf '%s\n' "$info" | awk -F': *' '/Data Length/{print $2; exit}')"
  [ -n "$dlen" ] && echo "      on-chain  : $dlen"

  if [ -f "$so" ]; then
    tmp="$(mktemp -t "verify_${name}.XXXXXX")"
    if solana program dump "$pid" "$tmp" --url "$DEVNET_RPC_URL" >/dev/null 2>&1; then
      n="$(wc -c < "$so" | tr -d ' ')"
      local_hash="$(shasum -a 256 "$so" | awk '{print $1}')"
      chain_hash="$(head -c "$n" "$tmp" | shasum -a 256 | awk '{print $1}')"
      if [ "$local_hash" = "$chain_hash" ]; then
        echo "      bytecode  : MATCHES local build ($name.so)"
      else
        echo "      bytecode  : DIFFERS from local build (local $local_hash != chain $chain_hash)"; rc=1
      fi
    else
      echo "      bytecode  : (could not dump on-chain program)"; rc=1
    fi
    rm -f "$tmp"
  else
    echo "      bytecode  : (no local $name.so to compare)"
  fi
  return $rc
}

# Verify every program in PROGRAMS; prints a summary and returns nonzero if any
# program failed verification.
verify_all() {
  local entry fails=0
  echo "==> verifying programs against $DEVNET_RPC_URL"
  for entry in "${PROGRAMS[@]}"; do
    verify_program "${entry%%:*}" "${entry##*:}" || fails=$((fails + 1))
    echo
  done
  if [ "$fails" -eq 0 ]; then
    echo "==> all ${#PROGRAMS[@]} programs verified OK"
  else
    echo "==> $fails program(s) FAILED verification"
  fi
  return "$fails"
}
