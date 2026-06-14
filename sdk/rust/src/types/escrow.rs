use serde::{Deserialize, Serialize};
use std::collections::HashMap;
#[allow(unused_imports)]
use super::*; // sibling types share a flat namespace, like the TS barrel

pub type EscrowStatus = String;
pub type EscrowDisputeTier = String;
pub type EscrowDisputeStatus = String;
pub type EscrowEvidenceType = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowTerms {
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub deliverables: Option<Vec<String>>,
    pub deadline: String,
    pub max_revisions: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub auto_release_after: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowMilestone {
    pub milestone_id: String,
    pub title: String,
    pub amount: String,
    pub deadline: String,
    pub status: String,
    pub revision_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowDelivery {
    pub delivery_id: String,
    pub submitted_by: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub refs: Option<Vec<String>>,
    pub submitted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowExtension {
    pub extension_id: String,
    pub requested_by: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub reason: Option<String>,
    pub deadline: String,
    pub status: String,
    pub requested_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub approved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowEvidence {
    pub evidence_id: String,
    pub dispute_id: String,
    pub submitted_by: String,
    #[serde(rename = "type")]
    pub evidence_type: EscrowEvidenceType,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub r#ref: Option<String>,
    pub submitted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowMediationProposal {
    pub proposed_at: String,
    pub resolution: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub client_amount: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub provider_amount: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rationale: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowCouncilVote {
    pub agent: String,
    pub vote: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub client_pct: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub provider_pct: Option<f64>,
    pub round: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rationale: Option<String>,
    pub voted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowArbitrationOutcome {
    pub resolution: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub client_pct: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub provider_pct: Option<f64>,
    pub round: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rationale: Option<String>,
    pub resolved_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowDispute {
    pub dispute_id: String,
    pub escrow_id: String,
    pub tier: EscrowDisputeTier,
    pub opened_by: String,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub evidence: Option<Vec<EscrowEvidence>>,
    pub status: EscrowDisputeStatus,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub proposal: Option<EscrowMediationProposal>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub mediation_accepted_by: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub arbitration_paid_by: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub arbitration_round: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub council: Option<Vec<EscrowCouncilVote>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub arbitration_outcome: Option<EscrowArbitrationOutcome>,
    pub opened_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub escalated_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub resolved_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Escrow {
    pub escrow_id: String,
    pub status: EscrowStatus,
    pub client: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub client_crypto_id: Option<String>,
    pub provider: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub provider_crypto_id: Option<String>,
    pub amount: String,
    pub asset: String,
    pub network: String,
    pub terms: EscrowTerms,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub milestones: Option<Vec<EscrowMilestone>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub deliveries: Option<Vec<EscrowDelivery>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub extensions: Option<Vec<EscrowExtension>>,
    pub revision_count: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub dispute: Option<EscrowDispute>,
    pub created_at: String,
    pub funded_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub accepted_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub delivered_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub resolved_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub cancelled_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub on_chain_tx: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub ledger_tx_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub release_ledger_tx_id: Option<String>,
}

/// A milestone as supplied at escrow creation
/// (`Omit<EscrowMilestone, "milestoneId" | "status" | "revisionCount">`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowMilestoneInput {
    pub title: String,
    pub amount: String,
    pub deadline: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowCreateRequest {
    pub client: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub client_crypto_id: Option<String>,
    pub provider: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub provider_crypto_id: Option<String>,
    pub amount: String,
    pub asset: String,
    pub network: String,
    pub terms: EscrowTerms,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub milestones: Option<Vec<EscrowMilestoneInput>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment: Option<HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_authorization: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub signature: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EscrowQueryParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub client: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub provider: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub status: Option<EscrowStatus>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub offset: Option<i64>,
}
