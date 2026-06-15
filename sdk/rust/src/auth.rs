//! Request authentication. Mirrors `sdk/typescript/src/auth.ts`.
//!
//! Three signing schemes, all Ed25519:
//! - **agent auth** (`Authorization: tiny.place <agentId>:<sig>:<ts>`) — sign `body + timestamp`.
//! - **directory write** (`X-TinyPlace-*` headers) — sign `METHOD\nURI\nts\nnonce\nsha256(body)`.
//! - **admin** (`Authorization: TinyPlace-Admin ...`) — as above plus an optional role line.

use rand::RngCore as _;

use crate::crypto::{sha256_hex, to_base64, to_base64_url};
use crate::error::Result;
use crate::signer::Signer;

/// A list of HTTP header name/value pairs.
pub type Headers = Vec<(String, String)>;

/// Admin actor/role bound into `TinyPlace-Admin` signatures.
#[derive(Debug, Clone, Default)]
pub struct AdminSigningOptions {
    pub actor: Option<String>,
    /// `"operator"` or `"auditor"`.
    pub role: Option<String>,
}

/// Current UTC timestamp in `YYYY-MM-DDTHH:MM:SS.sssZ` form (matches JS `toISOString`).
pub fn timestamp() -> String {
    chrono::Utc::now()
        .format("%Y-%m-%dT%H:%M:%S%.3fZ")
        .to_string()
}

/// A fresh base64-encoded 16-byte random nonce.
pub fn generate_nonce() -> String {
    let mut bytes = [0u8; 16];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    to_base64(&bytes)
}

/// Build the agent `Authorization` header value.
pub fn build_auth_header(agent_id: &str, signature: &str, timestamp: &str) -> String {
    format!("tiny.place {agent_id}:{signature}:{timestamp}")
}

/// Sign an agent request: signature over `body + timestamp`.
pub async fn sign_request(signer: &dyn Signer, body: &str) -> Result<Headers> {
    let ts = timestamp();
    let payload = format!("{body}{ts}");
    let signature = signer.sign(payload.as_bytes()).await?;
    Ok(vec![(
        "Authorization".to_string(),
        build_auth_header(&signer.agent_id(), &to_base64(&signature), &ts),
    )])
}

/// Sign an admin request.
pub async fn sign_admin_request(
    signer: &dyn Signer,
    method: &str,
    request_uri: &str,
    body: &str,
    options: &AdminSigningOptions,
) -> Result<Headers> {
    let ts = timestamp();
    let nonce = generate_nonce();
    let actor = options.actor.clone().unwrap_or_else(|| signer.agent_id());
    let body_hash = sha256_hex(body.as_bytes());
    let role_line = options
        .role
        .as_ref()
        .map(|role| format!("\n{role}"))
        .unwrap_or_default();
    let payload = format!("{method}\n{request_uri}\n{ts}\n{nonce}\n{body_hash}{role_line}");
    let signature = signer.sign(payload.as_bytes()).await?;
    let role_field = options
        .role
        .as_ref()
        .map(|role| format!(",role=\"{role}\""))
        .unwrap_or_default();
    Ok(vec![
        (
            "Authorization".to_string(),
            format!(
                "TinyPlace-Admin actor=\"{actor}\"{role_field},signature=\"{}\"",
                to_base64(&signature)
            ),
        ),
        ("X-TinyPlace-Date".to_string(), ts),
        ("X-TinyPlace-Nonce".to_string(), nonce),
    ])
}

/// Sign a directory-write request, returning the `X-TinyPlace-*` headers.
pub async fn sign_directory_write(
    signer: &dyn Signer,
    public_key_base64: &str,
    method: &str,
    request_uri: &str,
    body: &str,
) -> Result<Headers> {
    let ts = timestamp();
    let nonce = generate_nonce();
    let body_hash = sha256_hex(body.as_bytes());
    let payload = format!("{method}\n{request_uri}\n{ts}\n{nonce}\n{body_hash}");
    let signature = signer.sign(payload.as_bytes()).await?;
    Ok(vec![
        ("X-TinyPlace-Date".to_string(), ts),
        ("X-TinyPlace-Nonce".to_string(), nonce),
        (
            "X-TinyPlace-Public-Key".to_string(),
            public_key_base64.to_string(),
        ),
        ("X-TinyPlace-Signature".to_string(), to_base64(&signature)),
    ])
}

/// Sign a bare canonical payload, returning the base64 signature.
pub async fn sign_canonical_payload(signer: &dyn Signer, payload: &str) -> Result<String> {
    let signature = signer.sign(payload.as_bytes()).await?;
    Ok(to_base64(&signature))
}

/// Sign a canonical payload with freshness binding, returning a
/// `v1:<b64url(ts)>:<b64url(nonce)>:<b64(sig)>` token.
pub async fn sign_fresh_canonical_payload(signer: &dyn Signer, payload: &str) -> Result<String> {
    let ts = timestamp();
    let nonce = generate_nonce();
    let signed = format!("{payload}\n{ts}\n{nonce}");
    let signature = signer.sign(signed.as_bytes()).await?;
    Ok(format!(
        "v1:{}:{}:{}",
        to_base64_url(&ts),
        to_base64_url(&nonce),
        to_base64(&signature)
    ))
}
