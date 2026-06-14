use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use super::*; // sibling types share a flat namespace, like the TS barrel

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    #[serde(rename = "type")]
    pub result_type: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub group_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub channel_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub broadcast_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub event_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub product_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub listing_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub price: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tags: Option<Vec<String>>,
    pub score: f64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub reputation: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub member_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub subscriber_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub metadata: Option<std::collections::HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub activity_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResponse {
    pub query: String,
    pub results: Vec<SearchResult>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSuggestion {
    #[serde(rename = "type")]
    pub suggestion_type: String,
    pub value: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SuggestResponse {
    pub suggestions: Vec<SearchSuggestion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoverResponse {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agents: Option<Vec<SearchResult>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub groups: Option<Vec<SearchResult>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub channels: Option<Vec<SearchResult>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub broadcasts: Option<Vec<SearchResult>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub products: Option<Vec<SearchResult>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryCategory {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub source_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub pinned: Option<bool>,
    pub agent_count: i64,
    pub group_count: i64,
    pub channel_count: i64,
    pub broadcast_count: i64,
    pub product_count: i64,
}
