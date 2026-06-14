//! Approved-signer (delegated spending) API. Mirrors
//! `sdk/typescript/src/api/signers.ts`.

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::http::HttpClient;
use crate::types::SignerApproval;

/// A signed x402 authorization, in the flat shape the `/signers` endpoint
/// accepts (authorization fields plus the base64 signature).
///
/// This mirrors the TS `X402Authorization` (which extends
/// `X402AuthorizationFields` with a `signature`). The crate's
/// [`crate::x402::X402Authorization`] nests its fields, so this is a distinct
/// serializable request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct X402AuthorizationBody {
    /// `"exact" | "upto" | "batch-settlement"`.
    pub scheme: String,
    pub network: String,
    pub asset: String,
    pub amount: String,
    pub from: String,
    pub to: String,
    pub nonce: String,
    pub expires_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub metadata: Option<HashMap<String, String>>,
    pub signature: String,
}

/// Response from listing signer approvals.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignerApprovalList {
    pub signers: Vec<SignerApproval>,
}

/// Manage delegated signing approvals (budgeted spend authorizations).
#[derive(Clone)]
pub struct SignersApi {
    http: HttpClient,
}

impl SignersApi {
    pub(crate) fn new(http: HttpClient) -> Self {
        Self { http }
    }

    /// Approve a delegated signer with a signed x402 authorization.
    pub async fn approve(&self, authorization: X402AuthorizationBody) -> Result<SignerApproval> {
        self.http
            .post::<SignerApproval, X402AuthorizationBody>("/signers", Some(&authorization))
            .await
    }

    /// List signer approvals, optionally filtered by grantor.
    pub async fn list(&self, grantor: Option<&str>) -> Result<SignerApprovalList> {
        let query: Vec<(String, String)> = match grantor {
            Some(grantor) => vec![("grantor".to_string(), grantor.to_string())],
            None => Vec::new(),
        };
        self.http.get_directory_auth("/signers", &query).await
    }

    /// Fetch a single signer approval by signer key.
    pub async fn get(&self, signer_key: &str, grantor: Option<&str>) -> Result<SignerApproval> {
        let query: Vec<(String, String)> = match grantor {
            Some(grantor) => vec![("grantor".to_string(), grantor.to_string())],
            None => Vec::new(),
        };
        self.http
            .get_directory_auth(
                &format!("/signers/{}", crate::util::encode(signer_key)),
                &query,
            )
            .await
    }

    /// Revoke a signer approval.
    pub async fn revoke(&self, signer_key: &str, grantor: Option<&str>) -> Result<SignerApproval> {
        let query = match grantor {
            Some(grantor) => format!("?grantor={}", crate::util::encode(grantor)),
            None => String::new(),
        };
        self.http
            .delete_directory_auth::<SignerApproval, serde_json::Value>(
                &format!("/signers/{}{}", crate::util::encode(signer_key), query),
                None,
            )
            .await
    }
}
