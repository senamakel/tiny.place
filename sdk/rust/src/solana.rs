//! Delegated (gasless facilitator) x402 Solana settlement. Mirrors
//! `sdk/typescript/src/solana.ts` (`buildPayerSignedDelegatedTx` /
//! `buildDelegatedX402PaymentMap`).
//!
//! The Rust SDK does not depend on the heavy `solana-sdk` crate; the legacy
//! transaction wire format (shortvec length prefixes, message header, account
//! keys, blockhash, compiled instructions) is hand-rolled here, reusing the
//! Ed25519 signer, `bs58`, and `sha2` already pulled in for auth. The backend
//! decodes these legacy transactions by hand too.
//!
//! The "delegated" transaction is the standard x402 *exact*-scheme Solana
//! payment: instructions `[SetComputeUnitLimit, SetComputeUnitPrice,
//! TransferChecked]`, account 0 (the fee payer) is the **facilitator** (CDP /
//! PayAI) and the **payer** signs only as the SPL `TransferChecked` authority
//! (a read-only second signer). The fee-payer signature slot is left zeroed for
//! the backend to co-sign and broadcast at settle time — the agent never pays
//! the network fee. Only USDC/CASH-style SPL transfers go through this path.

use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use ed25519_dalek::{Signer as _, SigningKey as DalekSigningKey};
use serde_json::json;

use crate::crypto::{decode_base58, to_base64};
use crate::error::{Error, PaymentChallenge, Result};
use crate::signer::Signer;
use crate::x402::{build_x402_payment_map, X402PaymentAuthorizationOptions, X402PaymentMap};

/// Canonical mainnet Solana network id (the `solana:<genesis>` form).
pub const SOLANA_MAINNET_NETWORK: &str = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
/// The SPL Token program.
pub const SOLANA_TOKEN_PROGRAM_ID: &str = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
/// The System program (native SOL transfers).
pub const SOLANA_SYSTEM_PROGRAM_ID: &str = "11111111111111111111111111111111";
/// The ComputeBudget program (sets the compute unit limit + price).
pub const SOLANA_COMPUTE_BUDGET_PROGRAM_ID: &str = "ComputeBudget111111111111111111111111111111";
/// The Associated Token Account program (deterministic ATA derivation).
pub const SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID: &str = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

/// Default compute unit limit for the facilitator transfer (matches the web app).
pub const FACILITATOR_COMPUTE_UNIT_LIMIT: u32 = 40_000;
/// Default compute unit price in microlamports/CU (well under the 5,000,000 cap).
pub const FACILITATOR_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS: u64 = 1;

/// An async JSON-RPC callback: `(method, params) -> result`. Lets callers route
/// blockhash + token-account lookups through their own transport (e.g. the
/// backend's `/solana/rpc` proxy). [`default_rpc_request`] provides a direct
/// reqwest-backed implementation against a Solana RPC URL.
pub type RpcRequest = Arc<
    dyn Fn(
            String,
            serde_json::Value,
        ) -> Pin<Box<dyn Future<Output = Result<serde_json::Value>> + Send>>
        + Send
        + Sync,
>;

/// Options for [`build_payer_signed_delegated_tx`].
pub struct PayerSignedDelegatedTxOptions {
    /// The facilitator's fee-payer pubkey (the 402 challenge `metadata.feePayer`).
    pub fee_payer: String,
    /// The payee/recipient owner address (the challenge `to` / `payTo`).
    pub payee: String,
    /// Amount in the asset's base units (a positive integer string).
    pub amount: String,
    /// The SPL mint to transfer.
    pub mint: String,
    /// Token decimals (USDC/CASH = 6).
    pub decimals: u8,
    /// The agent's Solana secret key (32-byte seed or 64-byte key); signs as the
    /// transfer authority.
    pub secret_key: Vec<u8>,
    /// Overrides the payer's source token account (defaults to the agent's ATA).
    pub source_token_account: Option<String>,
    /// Overrides the payee's destination token account (defaults to its ATA).
    pub destination_token_account: Option<String>,
    /// Override the compute unit limit (defaults to [`FACILITATOR_COMPUTE_UNIT_LIMIT`]).
    pub compute_unit_limit: Option<u32>,
    /// Override the compute unit price (defaults to
    /// [`FACILITATOR_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS`]).
    pub compute_unit_price_micro_lamports: Option<u64>,
    /// A recent blockhash. When `None` it is fetched via `rpc`.
    pub recent_blockhash: Option<String>,
    /// JSON-RPC transport for blockhash + ATA lookups. Required unless
    /// `recent_blockhash` and both token accounts are supplied.
    pub rpc: Option<RpcRequest>,
}

/// Builds the standard x402 "exact" Solana payment for an autonomous agent and
/// partially signs it with the agent's keypair — the SDK counterpart to the web
/// app's wallet-signed builder. The transaction is
/// `[SetComputeUnitLimit, SetComputeUnitPrice, TransferChecked]` with the
/// facilitator as fee payer (account 0) and the agent as the transfer authority
/// (a read-only second signer). Only the agent signature is filled; the
/// fee-payer signature slot is left zeroed for the facilitator to co-sign and
/// broadcast at settle time. Returns the base64 wire transaction to attach as
/// the x402 payment's `metadata.delegatedTx`.
///
/// The payee's destination token account must already exist — the exact scheme
/// forbids ATA creation in the payment transaction.
pub async fn build_payer_signed_delegated_tx(
    options: PayerSignedDelegatedTxOptions,
) -> Result<String> {
    let signing_key = signing_key_from_secret(&options.secret_key)?;
    let payer = bs58::encode(signing_key.verifying_key().to_bytes()).into_string();
    let amount = normalized_amount(&options.amount)?;

    let source_token_account = match options.source_token_account.clone() {
        Some(account) => account,
        None => associated_token_account(&payer, &options.mint)?,
    };
    let destination_token_account = match options.destination_token_account.clone() {
        Some(account) => account,
        None => associated_token_account(&options.payee, &options.mint)?,
    };

    let recent_blockhash = match options.recent_blockhash.clone() {
        Some(blockhash) => blockhash,
        None => {
            let rpc = options.rpc.clone().ok_or_else(|| {
                Error::InvalidArgument(
                    "a recent_blockhash or rpc transport is required".to_string(),
                )
            })?;
            fetch_latest_blockhash(&rpc).await?
        }
    };

    let message = two_signer_facilitator_message(&FacilitatorMessage {
        fee_payer: &options.fee_payer,
        authority: &payer,
        source_token_account: &source_token_account,
        destination_token_account: &destination_token_account,
        mint: &options.mint,
        amount,
        decimals: options.decimals,
        compute_unit_limit: options
            .compute_unit_limit
            .unwrap_or(FACILITATOR_COMPUTE_UNIT_LIMIT),
        compute_unit_price_micro_lamports: options
            .compute_unit_price_micro_lamports
            .unwrap_or(FACILITATOR_COMPUTE_UNIT_PRICE_MICRO_LAMPORTS),
        recent_blockhash: &recent_blockhash,
    })?;

    // Sign as the authority (signer index 1). The fee-payer slot (index 0) is
    // left zeroed for the facilitator to fill at settle time.
    let authority_signature = signing_key.sign(&message).to_bytes();
    let mut wire = Vec::with_capacity(2 + 64 + 64 + message.len());
    wire.extend_from_slice(&short_vec(2));
    wire.extend_from_slice(&[0u8; 64]); // empty fee-payer signature
    wire.extend_from_slice(&authority_signature);
    wire.extend_from_slice(&message);
    Ok(to_base64(&wire))
}

/// The payment requirements parsed from a 402 challenge, used to fold a
/// delegated transaction into a complete x402 payment map.
#[derive(Debug, Clone, Default)]
pub struct DelegatedPaymentRequirements {
    pub network: String,
    pub asset: String,
    pub amount: String,
    pub to: String,
    pub metadata: Option<HashMap<String, String>>,
}

/// Options for [`build_delegated_x402_payment_map`].
pub struct DelegatedX402PaymentMapOptions {
    /// The facilitator's fee-payer pubkey (the 402 challenge `metadata.feePayer`).
    pub fee_payer: String,
    /// The SPL mint to transfer.
    pub mint: String,
    /// Token decimals (USDC/CASH = 6).
    pub decimals: u8,
    /// The agent's Solana secret key (32-byte seed or 64-byte key).
    pub secret_key: Vec<u8>,
    pub source_token_account: Option<String>,
    pub destination_token_account: Option<String>,
    pub compute_unit_limit: Option<u32>,
    pub compute_unit_price_micro_lamports: Option<u64>,
    pub recent_blockhash: Option<String>,
    pub rpc: Option<RpcRequest>,
    /// The payment requirements from the 402 challenge.
    pub payment: DelegatedPaymentRequirements,
    /// The payer wallet address recorded on the authorization (defaults to the
    /// signer's agent id).
    pub from: Option<String>,
}

/// Convenience wrapper: builds the agent-signed facilitator transfer and folds
/// it into a complete x402 payment map (with the wire transaction under
/// `metadata.delegatedTx`), ready to resubmit to the paid endpoint. The backend
/// routes any payment carrying `metadata.delegatedTx` to the facilitator.
pub async fn build_delegated_x402_payment_map(
    signer: &dyn Signer,
    options: DelegatedX402PaymentMapOptions,
) -> Result<X402PaymentMap> {
    let wire = build_payer_signed_delegated_tx(PayerSignedDelegatedTxOptions {
        fee_payer: options.fee_payer,
        payee: options.payment.to.clone(),
        amount: options.payment.amount.clone(),
        mint: options.mint,
        decimals: options.decimals,
        secret_key: options.secret_key,
        source_token_account: options.source_token_account,
        destination_token_account: options.destination_token_account,
        compute_unit_limit: options.compute_unit_limit,
        compute_unit_price_micro_lamports: options.compute_unit_price_micro_lamports,
        recent_blockhash: options.recent_blockhash,
        rpc: options.rpc,
    })
    .await?;

    let mut metadata = options.payment.metadata.unwrap_or_default();
    metadata.insert("delegatedTx".to_string(), wire);

    build_x402_payment_map(
        signer,
        X402PaymentAuthorizationOptions {
            network: options.payment.network,
            asset: options.payment.asset,
            amount: options.payment.amount,
            to: options.payment.to,
            from: options.from,
            metadata: Some(metadata),
            ..Default::default()
        },
    )
    .await
}

/// A direct reqwest-backed [`RpcRequest`] against a Solana JSON-RPC URL. Mirrors
/// the TS/Python SDK's built-in transport.
pub fn default_rpc_request(rpc_url: impl Into<String>) -> RpcRequest {
    let rpc_url = rpc_url.into();
    let client = reqwest::Client::new();
    Arc::new(move |method: String, params: serde_json::Value| {
        let rpc_url = rpc_url.clone();
        let client = client.clone();
        Box::pin(async move {
            let body = json!({
                "jsonrpc": "2.0",
                "id": method,
                "method": method,
                "params": params,
            });
            let response = client.post(&rpc_url).json(&body).send().await?;
            if !response.status().is_success() {
                return Err(Error::Rpc(format!(
                    "Solana RPC {method} failed with HTTP {}",
                    response.status().as_u16()
                )));
            }
            let payload: serde_json::Value = response.json().await?;
            if let Some(error) = payload.get("error") {
                let message = error
                    .get("message")
                    .and_then(|m| m.as_str())
                    .map(|s| s.to_string())
                    .unwrap_or_else(|| error.to_string());
                return Err(Error::Rpc(format!("Solana RPC {method} failed: {message}")));
            }
            payload
                .get("result")
                .cloned()
                .ok_or_else(|| Error::Rpc(format!("Solana RPC {method} returned no result")))
        }) as Pin<Box<dyn Future<Output = Result<serde_json::Value>> + Send>>
    })
}

/// Resolve `owner`'s token account for `mint` over the RPC transport, returning
/// the first account holding at least `minimum_amount` (when set). Mirrors the
/// TS/Python `findTokenAccount`. The delegated builder uses the deterministic
/// ATA instead, but this is exported for callers that need an existing account.
pub async fn find_token_account(
    rpc: &RpcRequest,
    owner: &str,
    mint: &str,
    minimum_amount: Option<&str>,
) -> Result<String> {
    let params = json!([
        owner,
        { "mint": mint },
        { "encoding": "jsonParsed", "commitment": "confirmed" },
    ]);
    let result = rpc("getTokenAccountsByOwner".to_string(), params).await?;
    let minimum: Option<u128> = minimum_amount.and_then(|m| m.parse().ok());
    let accounts = result
        .get("value")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    for account in accounts {
        let amount = account
            .pointer("/account/data/parsed/info/tokenAmount/amount")
            .and_then(|v| v.as_str())
            .unwrap_or("0")
            .parse::<u128>()
            .unwrap_or(0);
        if minimum.is_none_or(|min| amount >= min) {
            if let Some(pubkey) = account.get("pubkey").and_then(|v| v.as_str()) {
                return Ok(pubkey.to_string());
            }
        }
    }
    Err(Error::Rpc(format!("No token account found for {owner}")))
}

async fn fetch_latest_blockhash(rpc: &RpcRequest) -> Result<String> {
    let params = json!([{ "commitment": "confirmed" }]);
    let result = rpc("getLatestBlockhash".to_string(), params).await?;
    result
        .pointer("/value/blockhash")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| Error::Rpc("getLatestBlockhash returned no blockhash".to_string()))
}

/// Derive the associated token account (ATA) for `owner` + `mint` under the
/// SPL Associated Token program, by `find_program_address` over the seeds
/// `[owner, TOKEN_PROGRAM, mint]`.
pub fn associated_token_account(owner: &str, mint: &str) -> Result<String> {
    let owner_bytes = decode_pubkey(owner)?;
    let token_program = decode_pubkey(SOLANA_TOKEN_PROGRAM_ID)?;
    let mint_bytes = decode_pubkey(mint)?;
    let program = decode_pubkey(SOLANA_ASSOCIATED_TOKEN_PROGRAM_ID)?;
    let seeds = [
        owner_bytes.as_slice(),
        token_program.as_slice(),
        mint_bytes.as_slice(),
    ];
    let (address, _bump) = find_program_address(&seeds, &program)?;
    Ok(bs58::encode(address).into_string())
}

/// Find a valid program-derived address (PDA) for `seeds` under `program_id`,
/// returning `(address, bump)`. Hand-rolled to avoid the `solana-sdk` crate.
fn find_program_address(seeds: &[&[u8]], program_id: &[u8; 32]) -> Result<([u8; 32], u8)> {
    use sha2::{Digest, Sha256};
    for bump in (0u8..=255).rev() {
        let mut hasher = Sha256::new();
        for seed in seeds {
            hasher.update(seed);
        }
        hasher.update([bump]);
        hasher.update(program_id);
        hasher.update(b"ProgramDerivedAddress");
        let hash: [u8; 32] = hasher.finalize().into();
        if !is_on_curve(&hash) {
            return Ok((hash, bump));
        }
    }
    Err(Error::InvalidArgument(
        "unable to find a program-derived address (no off-curve bump)".to_string(),
    ))
}

/// True when `bytes` is a valid Ed25519 curve point (i.e. NOT a valid PDA). A
/// PDA must be off-curve. Uses `curve25519-dalek` (already a dependency).
fn is_on_curve(bytes: &[u8; 32]) -> bool {
    curve25519_dalek::edwards::CompressedEdwardsY(*bytes)
        .decompress()
        .is_some()
}

struct FacilitatorMessage<'a> {
    fee_payer: &'a str,
    authority: &'a str,
    source_token_account: &'a str,
    destination_token_account: &'a str,
    mint: &'a str,
    amount: u64,
    decimals: u8,
    compute_unit_limit: u32,
    compute_unit_price_micro_lamports: u64,
    recent_blockhash: &'a str,
}

/// Serialize a two-signer legacy message for the facilitator transfer. Account
/// ordering follows Solana's rules: writable signers, then read-only signers,
/// then writable non-signers, then read-only non-signers. The fee payer must be
/// account 0; the transfer authority is a read-only signer at index 1.
fn two_signer_facilitator_message(options: &FacilitatorMessage<'_>) -> Result<Vec<u8>> {
    // 0: feePayer (writable signer), 1: authority (read-only signer),
    // 2: source, 3: destination (writable non-signers),
    // 4: mint, 5: token program, 6: compute budget program (read-only non-signers).
    let account_keys = [
        options.fee_payer,
        options.authority,
        options.source_token_account,
        options.destination_token_account,
        options.mint,
        SOLANA_TOKEN_PROGRAM_ID,
        SOLANA_COMPUTE_BUDGET_PROGRAM_ID,
    ];
    // Header: 2 required signatures, 0 readonly-signed accounts? No — the
    // authority is a read-only SIGNED account, so readonly-signed = 1; the last
    // three keys are readonly-unsigned = 3.
    let header = [2u8, 1u8, 3u8];

    // SetComputeUnitLimit: u8 discriminant (2) + u32 LE limit.
    let mut compute_limit_data = Vec::with_capacity(5);
    compute_limit_data.push(2u8);
    compute_limit_data.extend_from_slice(&options.compute_unit_limit.to_le_bytes());
    // SetComputeUnitPrice: u8 discriminant (3) + u64 LE microlamports.
    let mut compute_price_data = Vec::with_capacity(9);
    compute_price_data.push(3u8);
    compute_price_data.extend_from_slice(&options.compute_unit_price_micro_lamports.to_le_bytes());
    // TransferChecked: u8 discriminant (12) + u64 LE amount + u8 decimals.
    let mut transfer_data = Vec::with_capacity(10);
    transfer_data.push(12u8);
    transfer_data.extend_from_slice(&options.amount.to_le_bytes());
    transfer_data.push(options.decimals);

    let blockhash = decode_blockhash(options.recent_blockhash)?;

    let mut message = Vec::new();
    message.extend_from_slice(&header);
    message.extend_from_slice(&short_vec(account_keys.len() as u32));
    for key in account_keys {
        message.extend_from_slice(&decode_pubkey(key)?);
    }
    message.extend_from_slice(&blockhash);
    // Three instructions.
    message.extend_from_slice(&short_vec(3));
    // ComputeBudget SetComputeUnitLimit (program index 6, no accounts).
    message.push(6);
    message.extend_from_slice(&short_vec(0));
    message.extend_from_slice(&short_vec(compute_limit_data.len() as u32));
    message.extend_from_slice(&compute_limit_data);
    // ComputeBudget SetComputeUnitPrice (program index 6, no accounts).
    message.push(6);
    message.extend_from_slice(&short_vec(0));
    message.extend_from_slice(&short_vec(compute_price_data.len() as u32));
    message.extend_from_slice(&compute_price_data);
    // Token TransferChecked (program index 5): source, mint, dest, authority.
    message.push(5);
    message.extend_from_slice(&short_vec(4));
    message.extend_from_slice(&[2u8, 4u8, 3u8, 1u8]);
    message.extend_from_slice(&short_vec(transfer_data.len() as u32));
    message.extend_from_slice(&transfer_data);
    Ok(message)
}

/// Encode a length as a Solana shortvec / compact-u16 (little-endian base-128).
fn short_vec(value: u32) -> Vec<u8> {
    let mut bytes = Vec::new();
    let mut current = value;
    loop {
        let mut byte = (current & 0x7f) as u8;
        current >>= 7;
        if current > 0 {
            byte |= 0x80;
        }
        bytes.push(byte);
        if current == 0 {
            break;
        }
    }
    bytes
}

/// Decode a base58 pubkey into exactly 32 bytes.
fn decode_pubkey(value: &str) -> Result<[u8; 32]> {
    let bytes = decode_base58(value)
        .map_err(|err| Error::InvalidArgument(format!("invalid base58 pubkey {value}: {err}")))?;
    bytes.as_slice().try_into().map_err(|_| {
        Error::InvalidArgument(format!(
            "pubkey {value} does not decode to 32 bytes (got {})",
            bytes.len()
        ))
    })
}

/// Decode a base58 blockhash into exactly 32 bytes.
fn decode_blockhash(value: &str) -> Result<[u8; 32]> {
    let bytes = decode_base58(value)
        .map_err(|err| Error::InvalidArgument(format!("invalid base58 blockhash: {err}")))?;
    bytes.as_slice().try_into().map_err(|_| {
        Error::InvalidArgument(format!(
            "blockhash does not decode to 32 bytes (got {})",
            bytes.len()
        ))
    })
}

fn signing_key_from_secret(secret: &[u8]) -> Result<DalekSigningKey> {
    if secret.len() != 32 && secret.len() != 64 {
        return Err(Error::InvalidArgument(format!(
            "Solana secret key must be 32 or 64 bytes, got {}",
            secret.len()
        )));
    }
    let mut seed = [0u8; 32];
    seed.copy_from_slice(&secret[..32]);
    let signing_key = DalekSigningKey::from_bytes(&seed);
    if secret.len() == 64 && signing_key.verifying_key().to_bytes() != secret[32..] {
        return Err(Error::InvalidArgument(
            "Solana secret key public key does not match seed".to_string(),
        ));
    }
    Ok(signing_key)
}

fn normalized_amount(amount: &str) -> Result<u64> {
    let trimmed = amount.trim();
    let value: u64 = trimmed.parse().map_err(|_| {
        Error::InvalidArgument(format!(
            "Solana payment amount must be an integer: {amount}"
        ))
    })?;
    if value == 0 {
        return Err(Error::InvalidArgument(format!(
            "Solana payment amount must be a positive integer: {amount}"
        )));
    }
    Ok(value)
}

/// Options bridging a parsed 402 [`PaymentChallenge`] to a delegated payment
/// map: only the SPL transfer secret + RPC transport are needed, since the fee
/// payer, amount, recipient, and asset come from the challenge.
pub struct ChallengeDelegatedPaymentOptions {
    /// The agent's Solana secret key (32-byte seed or 64-byte key).
    pub secret_key: Vec<u8>,
    /// Token decimals (USDC/CASH = 6). Defaults to 6.
    pub decimals: Option<u8>,
    /// JSON-RPC transport for blockhash + token-account lookups. When omitted, a
    /// direct reqwest transport against `rpc_url` is used.
    pub rpc: Option<RpcRequest>,
    /// Solana RPC URL used to build the default transport when `rpc` is unset.
    pub rpc_url: Option<String>,
    /// Override the SPL mint (defaults to the challenge `asset`).
    pub mint: Option<String>,
    pub source_token_account: Option<String>,
    pub destination_token_account: Option<String>,
    /// The payer wallet address recorded on the authorization (defaults to the
    /// signer's agent id).
    pub from: Option<String>,
}

/// Build a delegated (gasless facilitator) x402 payment map from a parsed 402
/// [`PaymentChallenge`]. Reads the facilitator fee payer from
/// `metadata.feePayer`, the recipient/amount/asset/network from the challenge,
/// and signs the SPL `TransferChecked` as the transfer authority. Shared by the
/// bounty + registry Solana-payment flows.
pub async fn build_delegated_payment_from_challenge(
    signer: &dyn Signer,
    challenge: &PaymentChallenge,
    options: ChallengeDelegatedPaymentOptions,
) -> Result<X402PaymentMap> {
    let metadata = challenge.metadata.clone().unwrap_or_default();
    let fee_payer = metadata.get("feePayer").cloned().ok_or_else(|| {
        Error::InvalidArgument(
            "402 challenge is missing metadata.feePayer (required for delegated settlement)"
                .to_string(),
        )
    })?;
    let amount = challenge
        .amount
        .clone()
        .ok_or_else(|| Error::InvalidArgument("402 challenge is missing an amount".to_string()))?;
    let to = challenge.to.clone().ok_or_else(|| {
        Error::InvalidArgument("402 challenge is missing a recipient".to_string())
    })?;
    let asset = challenge.asset.clone().unwrap_or_default();
    let network = challenge
        .network
        .clone()
        .unwrap_or_else(|| SOLANA_MAINNET_NETWORK.to_string());
    let mint = options.mint.clone().unwrap_or_else(|| asset.clone());

    let rpc = options
        .rpc
        .clone()
        .or_else(|| options.rpc_url.clone().map(|url| default_rpc_request(url)));

    build_delegated_x402_payment_map(
        signer,
        DelegatedX402PaymentMapOptions {
            fee_payer,
            mint,
            decimals: options.decimals.unwrap_or(6),
            secret_key: options.secret_key,
            source_token_account: options.source_token_account,
            destination_token_account: options.destination_token_account,
            compute_unit_limit: None,
            compute_unit_price_micro_lamports: None,
            recent_blockhash: None,
            rpc,
            payment: DelegatedPaymentRequirements {
                network,
                asset,
                amount,
                to,
                metadata: Some(metadata),
            },
            from: options.from,
        },
    )
    .await
}

/// Extract the x402 [`PaymentChallenge`] from a `402` error, surfacing any other
/// error unchanged. Used to drive the challenge → delegated-payment → resubmit
/// flow.
pub fn payment_challenge(error: Error) -> Result<PaymentChallenge> {
    if error.status() == Some(402) {
        if let Some(required) = error.payment_required() {
            return Ok(required.payment.clone());
        }
    }
    Err(error)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::from_base64;
    use crate::signer::LocalSigner;

    /// A fixed 32-byte seed so the wire bytes are deterministic.
    fn test_signer() -> LocalSigner {
        LocalSigner::from_seed(&[7u8; 32]).expect("seed")
    }

    /// Decode a shortvec from `bytes` at `offset`, returning `(value, new_offset)`.
    fn read_short_vec(bytes: &[u8], mut offset: usize) -> (u32, usize) {
        let mut value: u32 = 0;
        let mut shift = 0;
        loop {
            let byte = bytes[offset];
            offset += 1;
            value |= ((byte & 0x7f) as u32) << shift;
            if byte & 0x80 == 0 {
                break;
            }
            shift += 7;
        }
        (value, offset)
    }

    #[test]
    fn ata_derivation_matches_known_vector() {
        // ATA for owner 9WzD…AWWM + USDC mint under the SPL Associated Token
        // program. Cross-checked with an independent ed25519 find_program_address
        // reference (bump 254) and consistent with @solana/spl-token.
        let owner = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
        let mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        let ata = associated_token_account(owner, mint).expect("ata");
        assert_eq!(ata, "FGETo8T8wMcN2wCjav8VK6eh3dLk63evNDPxzLSJra8B");
    }

    #[tokio::test]
    async fn delegated_payment_map_carries_delegated_tx_and_decodes() {
        let signer = test_signer();
        let fee_payer = "GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ"; // arbitrary
        let payee = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
        let mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
        // A valid base58 32-byte blockhash (reuse a pubkey-shaped value).
        let blockhash = "11111111111111111111111111111111";

        let map = build_delegated_x402_payment_map(
            &signer,
            DelegatedX402PaymentMapOptions {
                fee_payer: fee_payer.to_string(),
                mint: mint.to_string(),
                decimals: 6,
                secret_key: signer.seed().to_vec(),
                source_token_account: None,
                destination_token_account: None,
                compute_unit_limit: None,
                compute_unit_price_micro_lamports: None,
                recent_blockhash: Some(blockhash.to_string()),
                rpc: None,
                payment: DelegatedPaymentRequirements {
                    network: SOLANA_MAINNET_NETWORK.to_string(),
                    asset: mint.to_string(),
                    amount: "1000000".to_string(),
                    to: payee.to_string(),
                    metadata: None,
                },
                from: None,
            },
        )
        .await
        .expect("payment map");

        // The wire tx travels under metadata.delegatedTx.
        let wire_b64 = map
            .get("metadata.delegatedTx")
            .expect("delegatedTx present");
        let wire = from_base64(wire_b64).expect("base64");

        // Wire = shortvec(signatures=2) ++ feePayerSig[64](zero) ++ authoritySig[64] ++ message.
        let (sig_count, mut offset) = read_short_vec(&wire, 0);
        assert_eq!(sig_count, 2);
        let fee_payer_sig = &wire[offset..offset + 64];
        assert!(
            fee_payer_sig.iter().all(|b| *b == 0),
            "fee-payer signature slot must be zeroed for the facilitator to co-sign"
        );
        offset += 64; // fee-payer sig
        offset += 64; // authority sig
        let message = &wire[offset..];

        // Message header: 2 required signatures, 1 readonly-signed, 3 readonly-unsigned.
        assert_eq!(&message[0..3], &[2, 1, 3]);
        let (account_count, mut m) = read_short_vec(message, 3);
        assert_eq!(account_count, 7);

        // Account 0 (fee payer) is the facilitator.
        let fee_payer_key = bs58::encode(&message[m..m + 32]).into_string();
        assert_eq!(fee_payer_key, fee_payer);
        m += 32 * account_count as usize; // skip all account keys
        m += 32; // skip blockhash

        // Three instructions in order: ComputeUnitLimit, ComputeUnitPrice, TransferChecked.
        let (ix_count, mut ix) = read_short_vec(message, m);
        assert_eq!(ix_count, 3);

        // Instruction 1: program index 6 (compute budget), data[0] == 2 (SetComputeUnitLimit).
        let (prog0, after_prog0) = (message[ix], ix + 1);
        assert_eq!(prog0, 6);
        let (acct_len0, after_acct0) = read_short_vec(message, after_prog0);
        assert_eq!(acct_len0, 0);
        let (data_len0, data0_start) = read_short_vec(message, after_acct0);
        assert_eq!(message[data0_start], 2);
        ix = data0_start + data_len0 as usize;

        // Instruction 2: program index 6, data[0] == 3 (SetComputeUnitPrice).
        let prog1 = message[ix];
        assert_eq!(prog1, 6);
        let (acct_len1, after_acct1) = read_short_vec(message, ix + 1);
        assert_eq!(acct_len1, 0);
        let (data_len1, data1_start) = read_short_vec(message, after_acct1);
        assert_eq!(message[data1_start], 3);
        ix = data1_start + data_len1 as usize;

        // Instruction 3: program index 5 (token), data[0] == 12 (TransferChecked).
        let prog2 = message[ix];
        assert_eq!(prog2, 5);
        let (acct_len2, after_acct2) = read_short_vec(message, ix + 1);
        assert_eq!(acct_len2, 4);
        // Accounts: [source(2), mint(4), dest(3), authority(1)].
        assert_eq!(&message[after_acct2..after_acct2 + 4], &[2, 4, 3, 1]);
        let (_data_len2, data2_start) = read_short_vec(message, after_acct2 + 4);
        assert_eq!(message[data2_start], 12);

        // The map echoes the x402 fields.
        assert_eq!(
            map.get("network").map(String::as_str),
            Some(SOLANA_MAINNET_NETWORK)
        );
        assert_eq!(map.get("amount").map(String::as_str), Some("1000000"));
        assert_eq!(map.get("to").map(String::as_str), Some(payee));
    }
}
