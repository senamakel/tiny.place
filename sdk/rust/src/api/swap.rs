//! Token swap quotes and execution. Mirrors `sdk/typescript/src/api/swap.ts`.

use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::http::HttpClient;
use crate::types::{SwapExecuteRequest, SwapExecution, SwapQuote};
use crate::util::encode;

/// Parameters for a swap quote request.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwapQuoteParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub to: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub from_asset: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub to_asset: Option<String>,
    pub amount: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub network: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub slippage_tolerance: Option<String>,
}

/// Parameters for a swap history request.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwapHistoryParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub offset: Option<i64>,
}

/// Response wrapping a list of swap executions.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwapHistoryResponse {
    pub swaps: Vec<SwapExecution>,
}

#[derive(Clone)]
pub struct SwapApi {
    http: HttpClient,
}

impl SwapApi {
    pub(crate) fn new(http: HttpClient) -> Self {
        Self { http }
    }

    pub async fn quote(&self, params: &SwapQuoteParams) -> Result<SwapQuote> {
        let mut q: Vec<(String, String)> = Vec::new();
        if let Some(from) = params.from.clone().or_else(|| params.from_asset.clone()) {
            q.push(("from".into(), from));
        }
        if let Some(to) = params.to.clone().or_else(|| params.to_asset.clone()) {
            q.push(("to".into(), to));
        }
        q.push(("amount".into(), params.amount.clone()));
        if let Some(network) = &params.network {
            q.push(("network".into(), network.clone()));
        }
        if let Some(slippage) = &params.slippage_tolerance {
            q.push(("slippageTolerance".into(), slippage.clone()));
        }
        self.http.get("/swap/quote", &q).await
    }

    pub async fn execute(
        &self,
        request: &SwapExecuteRequest,
        agent_id: Option<&str>,
    ) -> Result<SwapExecution> {
        if let Some(agent_id) = agent_id {
            self.http
                .post_directory_auth_as("/swap/execute", agent_id, Some(request))
                .await
        } else {
            self.http.post("/swap/execute", Some(request)).await
        }
    }

    pub async fn get(&self, swap_id: &str, agent_id: Option<&str>) -> Result<SwapExecution> {
        let path = format!("/swap/{}", encode(swap_id));
        if let Some(agent_id) = agent_id {
            self.http.get_directory_auth_as(&path, agent_id, &[]).await
        } else {
            self.http.get(&path, &[]).await
        }
    }

    pub async fn status(&self, swap_id: &str, agent_id: Option<&str>) -> Result<SwapExecution> {
        let path = format!("/swap/status/{}", encode(swap_id));
        if let Some(agent_id) = agent_id {
            self.http.get_directory_auth_as(&path, agent_id, &[]).await
        } else {
            self.http.get(&path, &[]).await
        }
    }

    pub async fn history(
        &self,
        params: Option<&SwapHistoryParams>,
        agent_id: Option<&str>,
    ) -> Result<SwapHistoryResponse> {
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
                .get_directory_auth_as("/swap/history", agent_id, &q)
                .await
        } else {
            self.http.get("/swap/history", &q).await
        }
    }
}
