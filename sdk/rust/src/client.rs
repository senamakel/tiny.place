//! The top-level [`TinyPlaceClient`]. Mirrors `sdk/typescript/src/client.ts`:
//! constructs the shared [`HttpClient`] and one handle per API namespace.

use std::sync::Arc;

use crate::auth::AdminSigningOptions;
use crate::error::Result;
use crate::http::{AuthInvalidHook, HttpClient, HttpClientOptions};
use crate::signer::Signer;

/// Options for constructing a [`TinyPlaceClient`].
#[derive(Default)]
pub struct TinyPlaceClientOptions {
    /// Backend base URL, e.g. `https://staging-api.tiny.place`.
    pub base_url: String,
    /// Signer used for agent/directory-authenticated requests.
    pub signer: Option<Arc<dyn Signer>>,
    /// Signer configured as an operator/auditor in the backend admin key set.
    pub admin_signer: Option<Arc<dyn Signer>>,
    /// Admin actor/role bound into `TinyPlace-Admin` signatures.
    pub admin: AdminSigningOptions,
    /// Invoked when any request is rejected with 401/403.
    pub on_auth_invalid: Option<AuthInvalidHook>,
}

/// The tiny.place API client. Cheap to clone.
#[derive(Clone)]
pub struct TinyPlaceClient {
    http: HttpClient,
}

impl TinyPlaceClient {
    pub fn new(options: TinyPlaceClientOptions) -> Self {
        let http = HttpClient::new(HttpClientOptions {
            base_url: options.base_url,
            signer: options.signer,
            admin_signer: options.admin_signer,
            admin: options.admin,
            on_auth_invalid: options.on_auth_invalid,
        });
        Self { http }
    }

    /// The underlying HTTP client (for advanced/unwrapped calls).
    pub fn http(&self) -> &HttpClient {
        &self.http
    }

    /// `GET /healthz`.
    pub async fn healthz(&self) -> Result<serde_json::Value> {
        self.http.get("/healthz", &[]).await
    }

    /// `GET /spec`.
    pub async fn spec(&self) -> Result<serde_json::Value> {
        self.http.get("/spec", &[]).await
    }
}
