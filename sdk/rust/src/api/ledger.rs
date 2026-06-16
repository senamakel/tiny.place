//! Ledger queries, on-chain verification, and the live transaction stream.
//! Mirrors `sdk/typescript/src/api/ledger.ts`.

use serde::Deserialize;

use crate::error::Result;
use crate::http::HttpClient;
use crate::types::{LedgerListParams, LedgerTransaction, LedgerVerifyRequest, LedgerVerifyResult};
use crate::util::encode;
use crate::ws::{query_suffix, WebSocketStream};

#[derive(Debug, Clone, Deserialize)]
pub struct LedgerTransactions {
    pub transactions: Vec<LedgerTransaction>,
}

/// Ledger API.
#[derive(Clone)]
pub struct LedgerApi {
    http: HttpClient,
}

impl LedgerApi {
    pub(crate) fn new(http: HttpClient) -> Self {
        Self { http }
    }

    /// List ledger transactions matching the given filters.
    pub async fn list(&self, params: Option<&LedgerListParams>) -> Result<LedgerTransactions> {
        let query = params.map(ledger_list_query).unwrap_or_default();
        self.http.get("/ledger/transactions", &query).await
    }

    /// Fetch a single ledger transaction by id.
    pub async fn get(&self, tx_id: &str) -> Result<LedgerTransaction> {
        let path = format!("/ledger/transactions/{}", encode(tx_id));
        self.http.get(&path, &[]).await
    }

    /// Verify an on-chain transaction against the ledger.
    pub async fn verify(&self, request: &LedgerVerifyRequest) -> Result<LedgerVerifyResult> {
        self.http.post_public("/ledger/verify", Some(request)).await
    }

    /// Live ledger transaction stream (`GET /ledger/stream`, WebSocket, no auth).
    /// Honors the `agent`, `limit`, and `type` filters. Attach callbacks and call
    /// [`WebSocketStream::connect`].
    pub fn stream(&self, params: Option<&LedgerListParams>) -> WebSocketStream {
        let mut query: Vec<(String, String)> = Vec::new();
        if let Some(params) = params {
            if let Some(agent) = &params.agent {
                query.push(("agent".into(), agent.clone()));
            }
            if let Some(limit) = params.limit {
                query.push(("limit".into(), limit.to_string()));
            }
            if let Some(type_) = &params.r#type {
                query.push(("type".into(), type_.clone()));
            }
        }
        let path = format!("/ledger/stream{}", query_suffix(&query));
        WebSocketStream::new(&self.http, &path, false)
    }
}

fn ledger_list_query(params: &LedgerListParams) -> Vec<(String, String)> {
    let mut query: Vec<(String, String)> = Vec::new();
    if let Some(limit) = params.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    if let Some(offset) = params.offset {
        query.push(("offset".to_string(), offset.to_string()));
    }
    let mut push = |key: &str, value: &Option<String>| {
        if let Some(value) = value {
            query.push((key.to_string(), value.clone()));
        }
    };
    push("agent", &params.agent);
    push("type", &params.r#type);
    push("network", &params.network);
    push("status", &params.status);
    push("from", &params.from);
    push("to", &params.to);
    push("after", &params.after);
    push("before", &params.before);
    push("asset", &params.asset);
    push("visibility", &params.visibility);
    query
}
