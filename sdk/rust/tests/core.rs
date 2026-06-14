//! Unit tests for the deterministic core (no network). These pin the exact
//! byte-for-byte signing/canonicalization behavior the backend depends on,
//! mirroring `sdk/typescript/tests`.

use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use tinyplace::auth::{
    build_auth_header, sign_fresh_canonical_payload, sign_request, AdminSigningOptions,
};
use tinyplace::crypto::{
    canonical_payload, derive_crypto_id, public_key_to_solana_address, sha256_hex,
};
use tinyplace::x402::{build_canonical_message, X402AuthorizationFields};
use tinyplace::{LocalSigner, Signer};

#[test]
fn solana_address_of_zero_key_is_all_ones() {
    // 32 zero bytes base58-encode to 32 '1' characters.
    let zero = [0u8; 32];
    assert_eq!(
        public_key_to_solana_address(&zero),
        "1".repeat(32),
    );
    assert_eq!(derive_crypto_id(&zero), "1".repeat(32));
}

#[test]
fn sha256_hex_matches_known_vector() {
    // SHA-256 of the empty string.
    assert_eq!(
        sha256_hex(b""),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
}

#[test]
fn canonical_payload_sorts_keys_recursively() {
    let payload = canonical_payload(
        "identity.renew",
        serde_json::json!({ "b": 1, "a": { "z": 2, "y": 3 } }),
    );
    assert_eq!(
        payload,
        r#"{"action":"identity.renew","fields":{"a":{"y":3,"z":2},"b":1}}"#
    );
}

#[test]
fn x402_canonical_message_order_and_metadata() {
    let mut metadata = std::collections::HashMap::new();
    metadata.insert("domain".to_string(), "tiny.place".to_string());
    metadata.insert("publicKey".to_string(), "PK".to_string());
    let fields = X402AuthorizationFields {
        scheme: "exact".into(),
        network: "solana".into(),
        asset: "USDC".into(),
        amount: "1".into(),
        from: "A".into(),
        to: "B".into(),
        nonce: "n".into(),
        // empty expiresAt is omitted from the canonical message
        expires_at: String::new(),
        metadata: Some(metadata),
    };
    assert_eq!(
        build_canonical_message(&fields),
        r#"{"domain":"tiny.place","scheme":"exact","network":"solana","asset":"USDC","amount":"1","from":"A","to":"B","nonce":"n","metadata":[{"key":"domain","value":"tiny.place"},{"key":"publicKey","value":"PK"}]}"#
    );
}

#[test]
fn signer_from_seed_is_deterministic() {
    let seed = [7u8; 32];
    let a = LocalSigner::from_seed(&seed).unwrap();
    let b = LocalSigner::from_seed(&seed).unwrap();
    assert_eq!(a.agent_id(), b.agent_id());
    assert_eq!(a.public_key_base64(), b.public_key_base64());
}

#[test]
fn from_seed_matches_typescript_sdk() {
    // Reference values produced by the TypeScript SDK (`LocalSigner.fromSeed`)
    // for a 32-byte seed of all 0x07 — pins cross-language identity derivation.
    let signer = LocalSigner::from_seed(&[7u8; 32]).unwrap();
    assert_eq!(
        signer.agent_id(),
        "GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB"
    );
    assert_eq!(
        signer.public_key_base64(),
        "6kpsY+KcUgq+9VB7Ey7F+ZVHdq6+vnuSQh7qaRRG0iw="
    );
}

#[test]
fn from_seed_rejects_wrong_length() {
    assert!(LocalSigner::from_seed(&[0u8; 31]).is_err());
}

#[tokio::test]
async fn signature_verifies_against_public_key() {
    let signer = LocalSigner::from_seed(&[3u8; 32]).unwrap();
    let message = b"hello tiny.place";
    let sig_bytes = signer.sign(message).await.unwrap();

    let verifying = VerifyingKey::from_bytes(signer.public_key()).unwrap();
    let signature = Signature::from_slice(&sig_bytes).unwrap();
    assert!(verifying.verify(message, &signature).is_ok());
}

#[tokio::test]
async fn sign_request_builds_expected_header_shape() {
    let signer = LocalSigner::from_seed(&[9u8; 32]).unwrap();
    let headers = sign_request(&signer, "{}").await.unwrap();
    assert_eq!(headers.len(), 1);
    let (name, value) = &headers[0];
    assert_eq!(name, "Authorization");
    // tiny.place <agentId>:<sig>:<timestamp>
    assert!(value.starts_with("tiny.place "));
    let rest = value.strip_prefix("tiny.place ").unwrap();
    let parts: Vec<&str> = rest.splitn(3, ':').collect();
    assert_eq!(parts.len(), 3);
    assert_eq!(parts[0], signer.agent_id());
    assert!(parts[2].ends_with('Z')); // ISO timestamp
}

#[tokio::test]
async fn fresh_canonical_payload_is_versioned_token() {
    let signer = LocalSigner::from_seed(&[5u8; 32]).unwrap();
    let token = sign_fresh_canonical_payload(&signer, "payload").await.unwrap();
    let parts: Vec<&str> = token.split(':').collect();
    assert_eq!(parts.len(), 4);
    assert_eq!(parts[0], "v1");
}

#[tokio::test]
async fn admin_request_includes_date_and_nonce() {
    let signer = LocalSigner::from_seed(&[11u8; 32]).unwrap();
    let opts = AdminSigningOptions {
        actor: Some("@root".into()),
        role: Some("operator".into()),
    };
    let headers = sign_admin_helper(&signer, &opts).await;
    let names: Vec<&str> = headers.iter().map(|(n, _)| n.as_str()).collect();
    assert!(names.contains(&"Authorization"));
    assert!(names.contains(&"X-TinyPlace-Date"));
    assert!(names.contains(&"X-TinyPlace-Nonce"));
    let auth = &headers.iter().find(|(n, _)| n == "Authorization").unwrap().1;
    assert!(auth.starts_with("TinyPlace-Admin actor=\"@root\""));
    assert!(auth.contains("role=\"operator\""));
}

async fn sign_admin_helper(
    signer: &LocalSigner,
    opts: &AdminSigningOptions,
) -> Vec<(String, String)> {
    tinyplace::auth::sign_admin_request(signer, "POST", "/admin/config", "{}", opts)
        .await
        .unwrap()
}

#[test]
fn auth_header_format() {
    assert_eq!(
        build_auth_header("@a", "SIG", "2026-01-01T00:00:00.000Z"),
        "tiny.place @a:SIG:2026-01-01T00:00:00.000Z"
    );
}
