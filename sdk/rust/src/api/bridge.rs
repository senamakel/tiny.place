//! Cross-chain bridge routes, quotes, and execution. Mirrors
//! `sdk/typescript/src/api/bridge.ts` (the `stream()` WebSocket helper is omitted).

use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::http::HttpClient;
use crate::types::{BridgeExecuteRequest, BridgeExecution, BridgeQuote, BridgeRoute};
use crate::util::encode;

/// Parameters for a bridge routes request.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeRoutesParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub to: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub asset: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub from_chain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub to_chain: Option<String>,
}

/// Parameters for a bridge quote request.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeQuoteParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub to: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub asset: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub from_chain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub to_chain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub token: Option<String>,
    pub amount: String,
}

/// Parameters for a bridge history request.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeHistoryParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub offset: Option<i64>,
}

/// Response wrapping a list of bridge routes.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeRoutesResponse {
    pub routes: Vec<BridgeRoute>,
}

/// Response wrapping a list of bridge executions.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeHistoryResponse {
    pub bridges: Vec<BridgeExecution>,
}

#[derive(Clone)]
pub struct BridgeApi {
    http: HttpClient,
}

impl BridgeApi {
    pub(crate) fn new(http: HttpClient) -> Self {
        Self { http }
    }

    pub async fn routes(&self, params: &BridgeRoutesParams) -> Result<BridgeRoutesResponse> {
        let mut q: Vec<(String, String)> = Vec::new();
        if let Some(from) = params.from.clone().or_else(|| params.from_chain.clone()) {
            q.push(("from".into(), from));
        }
        if let Some(to) = params.to.clone().or_else(|| params.to_chain.clone()) {
            q.push(("to".into(), to));
        }
        if let Some(asset) = &params.asset {
            q.push(("asset".into(), asset.clone()));
        }
        self.http.get("/bridge/routes", &q).await
    }

    pub async fn quote(&self, params: &BridgeQuoteParams) -> Result<BridgeQuote> {
        let mut q: Vec<(String, String)> = Vec::new();
        if let Some(from) = params.from.clone().or_else(|| params.from_chain.clone()) {
            q.push(("from".into(), from));
        }
        if let Some(to) = params.to.clone().or_else(|| params.to_chain.clone()) {
            q.push(("to".into(), to));
        }
        if let Some(asset) = params.asset.clone().or_else(|| params.token.clone()) {
            q.push(("asset".into(), asset));
        }
        q.push(("amount".into(), params.amount.clone()));
        self.http.get("/bridge/quote", &q).await
    }

    pub async fn execute(
        &self,
        request: &BridgeExecuteRequest,
        agent_id: Option<&str>,
    ) -> Result<BridgeExecution> {
        if let Some(agent_id) = agent_id {
            self.http
                .post_directory_auth_as("/bridge/execute", agent_id, Some(request))
                .await
        } else {
            self.http.post("/bridge/execute", Some(request)).await
        }
    }

    pub async fn get(&self, bridge_id: &str, agent_id: Option<&str>) -> Result<BridgeExecution> {
        let path = format!("/bridge/{}", encode(bridge_id));
        if let Some(agent_id) = agent_id {
            self.http.get_directory_auth_as(&path, agent_id, &[]).await
        } else {
            self.http.get(&path, &[]).await
        }
    }

    pub async fn status(&self, bridge_id: &str, agent_id: Option<&str>) -> Result<BridgeExecution> {
        let path = format!("/bridge/status/{}", encode(bridge_id));
        if let Some(agent_id) = agent_id {
            self.http.get_directory_auth_as(&path, agent_id, &[]).await
        } else {
            self.http.get(&path, &[]).await
        }
    }

    pub async fn history(
        &self,
        params: Option<&BridgeHistoryParams>,
        agent_id: Option<&str>,
    ) -> Result<BridgeHistoryResponse> {
        let mut q: Vec<(String, String)> = Vec::new();
        if let Some(params) = params {
            if let Some(limit) = params.limit {
                q.push(("limit".into(), limit.to_string()));
            }
            if let Some(offset) = params.offset {
                q.push(("offset".into(), offset.to_string()));
            }
        }
        if let Some(agent_id) = agent_id {
            self.http
                .get_directory_auth_as("/bridge/history", agent_id, &q)
                .await
        } else {
            self.http.get("/bridge/history", &q).await
        }
    }
}
