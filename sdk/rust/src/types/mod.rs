//! Request/response types for every API namespace.
//!
//! Types mirror the JSON shapes the backend exposes. Unknown/optional fields are
//! modeled as `Option<T>`; field names use `#[serde(rename_all = "camelCase")]`
//! to match the wire format.
