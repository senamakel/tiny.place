//! Pricing, swaps, and bridges. Mirrors `sdk/typescript/src/api/pricing.ts`
//! (REST surface only; WebSocket `priceStream()`/`bridgeStream()` are NOT ported).

use serde::Deserialize;

use crate::error::Result;
use crate::http::HttpClient;
use crate::types::{
    BridgeExecuteRequest, BridgeExecution, BridgeQuote, BridgeRoute, GasEstimate, PriceHistory,
    PriceQuote, SupportedChain, SwapExecuteRequest, SwapExecution, SwapQuote, TradePair,
};
use crate::util::encode;

#[derive(Debug, Clone, Deserialize)]
pub struct PriceAsset {
    pub symbol: String,
    #[serde(default)]
    pub address: Option<String>,
    pub decimals: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PriceAssets {
    pub assets: Vec<PriceAsset>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TradePairs {
    pub pairs: Vec<TradePair>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SupportedNetworks {
    pub networks: Vec<SupportedChain>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SwapHistory {
    pub swaps: Vec<SwapExecution>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BridgeRoutes {
    pub routes: Vec<BridgeRoute>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BridgeHistory {
    pub bridges: Vec<BridgeExecution>,
}

/// Params for [`PricingApi::quote`].
#[derive(Debug, Clone, Default)]
pub struct QuoteParams {
    pub base: String,
    pub quote: String,
    pub network: Option<String>,
}

/// Params for [`PricingApi::history`].
#[derive(Debug, Clone, Default)]
pub struct HistoryParams {
    pub base: String,
    pub quote: String,
    pub interval: String,
    pub from: Option<String>,
    pub to: Option<String>,
}

/// Params for [`PricingApi::swap_quote`].
#[derive(Debug, Clone, Default)]
pub struct SwapQuoteParams {
    pub from: Option<String>,
    pub to: Option<String>,
    pub from_asset: Option<String>,
    pub to_asset: Option<String>,
    pub amount: String,
    pub network: Option<String>,
}

/// Params for [`PricingApi::bridge_routes`].
#[derive(Debug, Clone, Default)]
pub struct BridgeRoutesParams {
    pub from: Option<String>,
    pub to: Option<String>,
    pub asset: Option<String>,
    pub from_chain: Option<String>,
    pub to_chain: Option<String>,
}

/// Params for [`PricingApi::bridge_quote`].
#[derive(Debug, Clone, Default)]
pub struct BridgeQuoteParams {
    pub from: Option<String>,
    pub to: Option<String>,
    pub asset: Option<String>,
    pub from_chain: Option<String>,
    pub to_chain: Option<String>,
    pub token: Option<String>,
    pub amount: String,
}

/// Pagination params for history listings.
#[derive(Debug, Clone, Default)]
pub struct PageParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Pricing / swap / bridge API.
#[derive(Clone)]
pub struct PricingApi {
    http: HttpClient,
}

fn push_opt(query: &mut Vec<(String, String)>, key: &str, value: &Option<String>) {
    if let Some(value) = value {
        query.push((key.to_string(), value.clone()));
    }
}

impl PricingApi {
    pub(crate) fn new(http: HttpClient) -> Self {
        Self { http }
    }

    // --- Price Data ---

    /// Fetch a price quote for a trading pair.
    pub async fn quote(&self, params: &QuoteParams) -> Result<PriceQuote> {
        let mut query = vec![
            ("base".to_string(), params.base.clone()),
            ("quote".to_string(), params.quote.clone()),
        ];
        push_opt(&mut query, "network", &params.network);
        self.http.get("/pricing/quote", &query).await
    }

    /// Fetch historical candles for a trading pair.
    pub async fn history(&self, params: &HistoryParams) -> Result<PriceHistory> {
        let mut query = vec![
            ("base".to_string(), params.base.clone()),
            ("quote".to_string(), params.quote.clone()),
            ("interval".to_string(), params.interval.clone()),
        ];
        push_opt(&mut query, "from", &params.from);
        push_opt(&mut query, "to", &params.to);
        self.http.get("/pricing/history", &query).await
    }

    /// List supported pricing assets.
    pub async fn assets(&self) -> Result<PriceAssets> {
        self.http.get("/pricing/assets", &[]).await
    }

    /// List supported trading pairs.
    pub async fn pairs(&self) -> Result<TradePairs> {
        self.http.get("/pricing/pairs", &[]).await
    }

    /// List supported networks.
    pub async fn networks(&self) -> Result<SupportedNetworks> {
        self.http.get("/pricing/networks", &[]).await
    }

    /// Fetch a gas estimate for `network`.
    pub async fn gas(&self, network: &str) -> Result<GasEstimate> {
        let query = vec![("network".to_string(), network.to_string())];
        self.http.get("/pricing/gas", &query).await
    }

    // --- Swap ---

    /// Fetch a swap quote.
    pub async fn swap_quote(&self, params: &SwapQuoteParams) -> Result<SwapQuote> {
        let mut query: Vec<(String, String)> = Vec::new();
        let from = params.from.clone().or_else(|| params.from_asset.clone());
        let to = params.to.clone().or_else(|| params.to_asset.clone());
        push_opt(&mut query, "from", &from);
        push_opt(&mut query, "to", &to);
        query.push(("amount".to_string(), params.amount.clone()));
        push_opt(&mut query, "network", &params.network);
        self.http.get("/swap/quote", &query).await
    }

    /// Execute a swap, optionally acting on behalf of `agent_id`.
    pub async fn execute_swap(
        &self,
        request: &SwapExecuteRequest,
        agent_id: Option<&str>,
    ) -> Result<SwapExecution> {
        match agent_id {
            Some(agent_id) => {
                self.http
                    .post_directory_auth_as("/swap/execute", agent_id, Some(request))
                    .await
            }
            None => self.http.post("/swap/execute", Some(request)).await,
        }
    }

    /// Fetch a swap by id, optionally acting on behalf of `agent_id`.
    pub async fn get_swap(&self, swap_id: &str, agent_id: Option<&str>) -> Result<SwapExecution> {
        let path = format!("/swap/{}", encode(swap_id));
        match agent_id {
            Some(agent_id) => self.http.get_directory_auth_as(&path, agent_id, &[]).await,
            None => self.http.get(&path, &[]).await,
        }
    }

    /// Fetch a swap's status, optionally acting on behalf of `agent_id`.
    pub async fn get_swap_status(
        &self,
        swap_id: &str,
        agent_id: Option<&str>,
    ) -> Result<SwapExecution> {
        let path = format!("/swap/status/{}", encode(swap_id));
        match agent_id {
            Some(agent_id) => self.http.get_directory_auth_as(&path, agent_id, &[]).await,
            None => self.http.get(&path, &[]).await,
        }
    }

    /// List swap history, optionally acting on behalf of `agent_id`.
    pub async fn swap_history(
        &self,
        params: Option<&PageParams>,
        agent_id: Option<&str>,
    ) -> Result<SwapHistory> {
        let query = params.map(page_query).unwrap_or_default();
        match agent_id {
            Some(agent_id) => {
                self.http
                    .get_directory_auth_as("/swap/history", agent_id, &query)
                    .await
            }
            None => self.http.get("/swap/history", &query).await,
        }
    }

    // --- Bridge ---

    /// List bridge routes.
    pub async fn bridge_routes(&self, params: &BridgeRoutesParams) -> Result<BridgeRoutes> {
        let mut query: Vec<(String, String)> = Vec::new();
        let from = params.from.clone().or_else(|| params.from_chain.clone());
        let to = params.to.clone().or_else(|| params.to_chain.clone());
        push_opt(&mut query, "from", &from);
        push_opt(&mut query, "to", &to);
        push_opt(&mut query, "asset", &params.asset);
        self.http.get("/bridge/routes", &query).await
    }

    /// Fetch a bridge quote.
    pub async fn bridge_quote(&self, params: &BridgeQuoteParams) -> Result<BridgeQuote> {
        let mut query: Vec<(String, String)> = Vec::new();
        let from = params.from.clone().or_else(|| params.from_chain.clone());
        let to = params.to.clone().or_else(|| params.to_chain.clone());
        let asset = params.asset.clone().or_else(|| params.token.clone());
        push_opt(&mut query, "from", &from);
        push_opt(&mut query, "to", &to);
        push_opt(&mut query, "asset", &asset);
        query.push(("amount".to_string(), params.amount.clone()));
        self.http.get("/bridge/quote", &query).await
    }

    /// Execute a bridge, optionally acting on behalf of `agent_id`.
    pub async fn execute_bridge(
        &self,
        request: &BridgeExecuteRequest,
        agent_id: Option<&str>,
    ) -> Result<BridgeExecution> {
        match agent_id {
            Some(agent_id) => {
                self.http
                    .post_directory_auth_as("/bridge/execute", agent_id, Some(request))
                    .await
            }
            None => self.http.post("/bridge/execute", Some(request)).await,
        }
    }

    /// Fetch a bridge by id, optionally acting on behalf of `agent_id`.
    pub async fn get_bridge(
        &self,
        bridge_id: &str,
        agent_id: Option<&str>,
    ) -> Result<BridgeExecution> {
        let path = format!("/bridge/{}", encode(bridge_id));
        match agent_id {
            Some(agent_id) => self.http.get_directory_auth_as(&path, agent_id, &[]).await,
            None => self.http.get(&path, &[]).await,
        }
    }

    /// Fetch a bridge's status, optionally acting on behalf of `agent_id`.
    pub async fn get_bridge_status(
        &self,
        bridge_id: &str,
        agent_id: Option<&str>,
    ) -> Result<BridgeExecution> {
        let path = format!("/bridge/status/{}", encode(bridge_id));
        match agent_id {
            Some(agent_id) => self.http.get_directory_auth_as(&path, agent_id, &[]).await,
            None => self.http.get(&path, &[]).await,
        }
    }

    /// List bridge history, optionally acting on behalf of `agent_id`.
    pub async fn bridge_history(
        &self,
        params: Option<&PageParams>,
        agent_id: Option<&str>,
    ) -> Result<BridgeHistory> {
        let query = params.map(page_query).unwrap_or_default();
        match agent_id {
            Some(agent_id) => {
                self.http
                    .get_directory_auth_as("/bridge/history", agent_id, &query)
                    .await
            }
            None => self.http.get("/bridge/history", &query).await,
        }
    }
}

fn page_query(params: &PageParams) -> Vec<(String, String)> {
    let mut query: Vec<(String, String)> = Vec::new();
    if let Some(limit) = params.limit {
        query.push(("limit".to_string(), limit.to_string()));
    }
    if let Some(offset) = params.offset {
        query.push(("offset".to_string(), offset.to_string()));
    }
    query
}
