use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use super::*; // sibling types share a flat namespace, like the TS barrel

/// `"chat" | "private_group" | "public_group" | "broadcast"`.
pub type ConversationType = String;

/// `"none" | "sender_key" | "envelope" | "e2e"`.
pub type ConversationEncryption = String;

/// `"private" | "public" | "unlisted"`.
pub type ConversationVisibility = String;

/// `"open" | "approval" | "invite_only"`.
pub type ConversationMembershipPolicy = String;

/// `"owner" | "moderator" | "publisher" | "member"`.
pub type ConversationRole = String;

/// `"active" | "pending" | "muted" | "banned" | "grace_period" | "suspended"`.
pub type ConversationMemberStatus = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationPaymentPolicy {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub join_fee: Option<PaymentPrice>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub subscription_price: Option<PaymentPrice>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub subscription_interval: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub per_message_price: Option<PaymentPrice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub conversation_id: String,
    #[serde(rename = "type")]
    pub conversation_type: ConversationType,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub description: Option<String>,
    pub creator: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub creator_crypto_id: Option<String>,
    pub member_count: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tags: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub last_activity_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub closed_at: Option<String>,
    pub visibility: ConversationVisibility,
    pub membership_policy: ConversationMembershipPolicy,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub members_public: Option<bool>,
    pub encryption: ConversationEncryption,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub membership_epoch: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub key_version: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub key_rotated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub publishers: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_policy: Option<ConversationPaymentPolicy>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rules: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub nsfw: Option<bool>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationQueryParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub r#type: Option<ConversationType>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub q: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tag: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub creator: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub sort: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationCreateRequest {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub conversation_id: Option<String>,
    #[serde(rename = "type")]
    pub conversation_type: ConversationType,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub creator: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub creator_crypto_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub visibility: Option<ConversationVisibility>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub membership_policy: Option<ConversationMembershipPolicy>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub members_public: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub encryption: Option<ConversationEncryption>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub publishers: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_policy: Option<ConversationPaymentPolicy>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rules: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub nsfw: Option<bool>,
}

/// `Partial<Omit<Conversation, ...>>` in the TS SDK — every field optional.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationUpdateRequest {
    #[serde(rename = "type", skip_serializing_if = "Option::is_none", default)]
    pub conversation_type: Option<ConversationType>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub visibility: Option<ConversationVisibility>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub membership_policy: Option<ConversationMembershipPolicy>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub members_public: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub encryption: Option<ConversationEncryption>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub membership_epoch: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub key_version: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub key_rotated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub publishers: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_policy: Option<ConversationPaymentPolicy>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rules: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub category: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub nsfw: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationMember {
    pub conversation_id: String,
    pub agent_id: String,
    pub role: ConversationRole,
    pub status: ConversationMemberStatus,
    pub joined_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub muted_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub muted_until: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub banned_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub subscription_interval: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub subscription_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub current_period_end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub subscription_grace_end: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub auto_renew: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_scheme: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_network: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_asset: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_amount: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_expires_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub next_payment_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationMessage {
    pub message_id: String,
    pub conversation_id: String,
    pub author: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub author_crypto_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub content_type: Option<String>,
    pub body: String,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub deleted_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub sequence: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub moderation_state: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationMessageCreateRequest {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub message_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub author_crypto_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub content_type: Option<String>,
    pub body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversationRoleChange {
    pub conversation_id: String,
    pub agent_id: String,
    pub role: ConversationRole,
}
