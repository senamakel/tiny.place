use serde::{Deserialize, Serialize};
use std::collections::HashMap;
#[allow(unused_imports)]
use super::*; // sibling types share a flat namespace, like the TS barrel

/// Coarse grouping of an activity event.
pub type ActivityCategory = String;

/// Known activity kinds. The backend may emit additional `ledger.<TYPE>`
/// fallback kinds as new ledger types are added, so the union stays open —
/// modeled here as an open `String`.
pub type ActivityKind = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEvent {
    pub event_id: String,
    pub kind: ActivityKind,
    pub category: ActivityCategory,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub actor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub target: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub amount: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub asset: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub network: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub reference: Option<LedgerReference>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub ledger_type: Option<LedgerType>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_id: Option<String>,
    pub timestamp: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityStats {
    pub total: i64,
    pub by_kind: HashMap<String, i64>,
    pub by_category: HashMap<String, i64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityListParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub offset: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub kind: Option<ActivityKind>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub category: Option<ActivityCategory>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub since: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityListResponse {
    pub events: Vec<ActivityEvent>,
    pub stats: ActivityStats,
}
