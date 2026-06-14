use std::collections::HashMap;

#[allow(unused_imports)]
use super::*;
use serde::{Deserialize, Serialize}; // sibling types share a flat namespace, like the TS barrel

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerFeeSummary {
    pub tx_id: String,
    pub amount: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rate: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerFeeDetail {
    pub tx_id: String,
    pub amount: String,
    pub amount_formatted: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rate: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerTransactionSummary {
    pub tx_id: String,
    pub visibility: crate::types::LedgerVisibility,
    #[serde(rename = "type")]
    pub transaction_type: crate::types::LedgerType,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub to: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub amount: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub asset: Option<String>,
    pub network: String,
    pub timestamp: String,
    pub on_chain_tx: String,
    pub status: crate::types::LedgerStatus,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub fee: Option<ExplorerFeeSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerParty {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub crypto_id: Option<String>,
    pub reputation: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerRelatedTransaction {
    pub tx_id: String,
    #[serde(rename = "type")]
    pub transaction_type: crate::types::LedgerType,
    pub relationship: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerTransactionDetail {
    pub tx_id: String,
    pub visibility: crate::types::LedgerVisibility,
    #[serde(rename = "type")]
    pub transaction_type: crate::types::LedgerType,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub from: Option<ExplorerParty>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub to: Option<ExplorerParty>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub amount: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub amount_formatted: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub asset: Option<String>,
    pub network: String,
    pub timestamp: String,
    pub on_chain_tx: String,
    pub on_chain_verified: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub block_number: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub confirmations: Option<i64>,
    pub status: crate::types::LedgerStatus,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub reference: Option<crate::types::LedgerReference>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub fee: Option<ExplorerFeeDetail>,
    pub related_transactions: Vec<ExplorerRelatedTransaction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerVerification {
    pub tx_id: String,
    pub on_chain_tx: String,
    pub network: String,
    pub verified: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub block_number: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub block_timestamp: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub confirmations: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub explorer_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerVolumeCount {
    pub count: i64,
    pub volume_usd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerFeeCount {
    pub count: i64,
    pub total_usd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerCounterparty {
    pub username: String,
    pub transaction_count: i64,
    pub volume_usd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerNetworkActivity {
    pub count: i64,
    pub volume_usd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerAgentSummary {
    pub total_transactions: i64,
    pub total_volume_usd: String,
    pub sent: ExplorerVolumeCount,
    pub received: ExplorerVolumeCount,
    pub fees_paid: ExplorerFeeCount,
    pub top_counterparties: Vec<ExplorerCounterparty>,
    pub by_type: HashMap<String, i64>,
    pub by_network: HashMap<String, ExplorerNetworkActivity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerAgentResponse {
    pub agent: ExplorerParty,
    pub summary: ExplorerAgentSummary,
    pub recent_transactions: Vec<ExplorerTransactionSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerLedgerOverview {
    pub total_entries: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub latest_tx_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub latest_timestamp: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerActivityWindow {
    pub transactions: i64,
    pub volume_usd: String,
    pub fees_usd: String,
    pub unique_agents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerAllTimeOverview {
    pub volume_usd: String,
    pub fees_usd: String,
    pub registered_agents: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerNetworkOverview {
    pub transactions: i64,
    pub volume_usd: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerOverview {
    pub timestamp: String,
    pub ledger: ExplorerLedgerOverview,
    pub last24h: ExplorerActivityWindow,
    pub all_time: ExplorerAllTimeOverview,
    pub by_network: HashMap<String, ExplorerNetworkOverview>,
    pub recent_transactions: Vec<ExplorerTransactionSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExplorerTransactionListResponse {
    pub transactions: Vec<ExplorerTransactionSummary>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
