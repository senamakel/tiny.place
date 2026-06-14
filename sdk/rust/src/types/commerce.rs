//! Commerce types (swaps, bridges, fees, stats). Mirrors
//! `sdk/typescript/src/types/commerce.ts`.

use std::collections::HashMap;

#[allow(unused_imports)]
use super::*;
use serde::{Deserialize, Serialize}; // sibling types share a flat namespace, like the TS barrel

/// A monetary amount on a given asset/network.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoneyAmount {
    pub asset: String,
    pub amount: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub network: Option<String>,
}

/// A fee amount, optionally with a percentage rate.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeeAmount {
    pub amount: String,
    pub asset: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub percent: Option<String>,
}

/// A spot price quote for a trading pair.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceQuote {
    pub base: String,
    pub quote: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub network: Option<String>,
    pub bid: String,
    pub ask: String,
    pub mid: String,
    pub volume24h: String,
    pub change24h: String,
    pub source: String,
    pub updated_at: String,
}

/// A single OHLCV candle.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceCandle {
    pub open: String,
    pub high: String,
    pub low: String,
    pub close: String,
    pub volume: String,
    pub timestamp: String,
}

/// Historical price candles for a pair.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriceHistory {
    pub base: String,
    pub quote: String,
    pub interval: String,
    pub candles: Vec<PriceCandle>,
}

/// A gas-fee estimate for a network.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GasEstimate {
    pub network: String,
    pub unit: String,
    pub slow: String,
    pub standard: String,
    pub fast: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub estimated_fee: Option<String>,
    pub updated_at: String,
}

/// A tradable pair and the networks it is available on.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TradePair {
    pub base: String,
    pub quote: String,
    pub networks: Vec<String>,
}

/// A swap quote.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwapQuote {
    pub quote_id: String,
    pub from: MoneyAmount,
    pub to: MoneyAmount,
    pub rate: String,
    pub price_impact: String,
    pub fee: FeeAmount,
    pub route: Vec<String>,
    pub expires_at: String,
    pub slippage_tolerance: String,
}

/// Request body for executing a swap quote.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwapExecuteRequest {
    pub quote_id: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_authorization: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment: Option<CommercePaymentPayload>,
    /// Spec alias for the target output address.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub destination: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub destination_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub slippage_tolerance: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub deadline: Option<i64>,
}

/// The result of executing a swap.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwapExecution {
    pub swap_id: String,
    pub quote_id: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agent_id: Option<String>,
    pub status: String,
    pub from: MoneyAmount,
    pub to: MoneyAmount,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub destination_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub ledger_entry: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub completed_at: Option<String>,
    pub created_at: String,
}

/// A cross-chain bridge route.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeRoute {
    pub provider: String,
    pub from: MoneyAmount,
    pub to: MoneyAmount,
    pub estimated_time: String,
    pub fee: FeeAmount,
    pub min_amount: String,
    pub max_amount: String,
}

/// A bridge quote.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeQuote {
    pub quote_id: String,
    pub from: MoneyAmount,
    pub to: MoneyAmount,
    pub provider: String,
    pub fee: FeeAmount,
    pub estimated_time: String,
    pub expires_at: String,
}

/// Request body for executing a bridge quote.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeExecuteRequest {
    pub quote_id: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub destination_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_authorization: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment: Option<CommercePaymentPayload>,
}

/// A signed payment payload carried by commerce execution requests.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommercePaymentPayload {
    pub scheme: String,
    pub network: String,
    pub asset: String,
    pub amount: String,
    pub from: String,
    pub to: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub nonce: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub expires_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub signature: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub metadata: Option<HashMap<String, String>>,
}

/// The result of executing a bridge.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeExecution {
    pub bridge_id: String,
    pub quote_id: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agent_id: Option<String>,
    pub status: String,
    pub from: MoneyAmount,
    pub to: MoneyAmount,
    pub provider: String,
    pub destination_address: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub source_tx_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub destination_tx_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub ledger_entry: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub completed_at: Option<String>,
    pub created_at: String,
}

/// A fee configuration rule.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeeConfig {
    pub fee_id: String,
    pub scope: String,
    pub transaction_type: crate::types::LedgerType,
    pub agents: Vec<String>,
    pub rate: String,
    pub effective_from: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub effective_until: Option<String>,
    pub created_by: String,
    pub reason: String,
    pub revoked: bool,
    pub updated_at: String,
}

/// Query params for resolving the applicable fee.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeeResolveParams {
    pub from: String,
    pub to: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub r#type: Option<crate::types::LedgerType>,
}

/// Response for a fee-resolution lookup.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeeResolveResponse {
    pub fee: FeeConfig,
}

/// Aggregate fee metrics (admin).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminFeeMetrics {
    pub count: i64,
    pub total: String,
    pub last24h: String,
    pub last30d: String,
    pub by_asset: HashMap<String, String>,
    pub by_network: HashMap<String, String>,
    pub by_transaction_type: HashMap<String, String>,
    pub by_agent: HashMap<String, String>,
}

/// An agent's payment status (admin).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentPaymentStatus {
    pub handle: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub reason: Option<String>,
    pub updated_by: String,
    pub updated_at: String,
}

/// An admin audit-log entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminAuditEntry {
    pub audit_id: String,
    pub action: String,
    pub actor: String,
    pub timestamp: String,
    pub params: HashMap<String, String>,
    pub reason: String,
}

/// A system configuration key/value.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemConfig {
    pub key: String,
    pub value: String,
    pub updated_by: String,
    pub updated_at: String,
}

/// A point-in-time stats snapshot.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsSnapshot {
    pub timestamp: String,
    pub agents: AgentStats,
    pub transactions: TransactionStats,
    pub volume: VolumeStats,
    pub fees: FeeStats,
}

/// Agent-level statistics. Field names match the snake_case wire format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStats {
    pub registered: i64,
    pub active_30d: i64,
    pub directory_cards: i64,
    pub groups: i64,
}

/// Transaction-level statistics. Field names match the snake_case wire format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionStats {
    pub total: i64,
    pub settled: i64,
    pub by_type: HashMap<String, i64>,
}

/// Volume statistics. Field names match the snake_case wire format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeStats {
    pub total_usd: String,
    pub by_asset: HashMap<String, String>,
    pub by_network: HashMap<String, String>,
    pub last_24h_usd: String,
    pub last_30d_usd: String,
}

/// Fee statistics. Field names match the snake_case wire format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeStats {
    pub total_usd: String,
    pub last_24h_usd: String,
    pub last_30d_usd: String,
}
