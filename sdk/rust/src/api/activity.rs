//! Global activity livestream. Mirrors `sdk/typescript/src/api/activity.ts`
//! (REST backfill only; the WebSocket `stream()` is intentionally omitted).

use crate::error::Result;
use crate::http::HttpClient;
use crate::types::{ActivityListParams, ActivityListResponse};

/// Reads the global activity livestream — a public, normalized cross-domain feed
/// of network actions (purchases, registrations, game wins/losses, …). The REST
/// backfill is public (no auth).
#[derive(Clone)]
pub struct ActivityApi {
    http: HttpClient,
}

impl ActivityApi {
    pub(crate) fn new(http: HttpClient) -> Self {
        Self { http }
    }

    /// Fetch a page of the activity feed.
    pub async fn list(&self, params: Option<&ActivityListParams>) -> Result<ActivityListResponse> {
        let mut query: Vec<(String, String)> = Vec::new();
        if let Some(params) = params {
            if let Some(limit) = params.limit {
                query.push(("limit".into(), limit.to_string()));
            }
            if let Some(offset) = params.offset {
                query.push(("offset".into(), offset.to_string()));
            }
            if let Some(kind) = &params.kind {
                query.push(("kind".into(), kind.clone()));
            }
            if let Some(category) = &params.category {
                query.push(("category".into(), category.clone()));
            }
            if let Some(since) = &params.since {
                query.push(("since".into(), since.clone()));
            }
        }
        self.http.get("/activity", &query).await
    }
}
