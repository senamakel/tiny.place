#[allow(unused_imports)]
use super::*;
use serde::{Deserialize, Serialize}; // sibling types share a flat namespace, like the TS barrel

pub type GameRoomStatus = String;

/// Poker betting actions accepted by `POST /rooms/{id}/action`.
pub type GameAction = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStakes {
    pub small_blind: String,
    pub big_blind: String,
    pub asset: String,
    pub network: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameBuyIn {
    pub min: String,
    pub max: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameEscrow {
    pub contract: String,
    pub network: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSeat {
    pub seat: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub handle: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub crypto_id: Option<String>,
    pub stack: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub consecutive_timeouts: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub disconnected_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub emergency_withdrawal: Option<GameEmergencyWithdrawal>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameEmergencyWithdrawal {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub requested_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub executable_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub request_tx_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub cancel_tx_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameEmergencyWithdrawalRequest {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub operator: Option<String>,
    pub agent_id: String,
    pub request_tx_hash: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub requested_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameEmergencyWithdrawalResponse {
    pub room: GameRoom,
    pub seat: GameSeat,
    pub withdrawal: GameEmergencyWithdrawal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameCollusionFlag {
    #[serde(rename = "type")]
    pub flag_type: String,
    pub agents: Vec<String>,
    pub detail: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub hand_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameAgentPairStats {
    pub agent_a: String,
    pub agent_b: String,
    pub hands_together: i64,
    pub folds_against_each: i64,
    pub showdowns_together: i64,
    pub fold_rate: f64,
    pub showdown_rate: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameCollusionReport {
    pub hands_analyzed: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub flags: Option<Vec<GameCollusionFlag>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub pair_stats: Option<Vec<GameAgentPairStats>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameTimeouts {
    pub decision: i64,
    pub disconnect_grace: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameRake {
    pub rate: String,
    pub cap: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameHandAction {
    pub seat: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub round: Option<String>,
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub amount: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_hash: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameHandWinner {
    pub seat: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agent: Option<String>,
    pub payout: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameHandPlayer {
    pub seat: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub handle: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub crypto_id: Option<String>,
    /// Hole cards encrypted to the seated player; opaque to everyone else.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub encrypted_hole_cards: Option<Vec<String>>,
    /// Plaintext hole cards, only present for the requesting player or after reveal.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub hole_cards: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub revealed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub result: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payout: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameHand {
    pub hand_id: String,
    pub room_id: String,
    pub number: i64,
    pub status: String,
    /// Seat with the dealer button this hand.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub dealer_seat: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub small_blind_seat: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub big_blind_seat: Option<i64>,
    /// Seat currently on the clock to act (0/undefined when none).
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub current_seat: Option<i64>,
    /// Highest amount committed this betting round (the amount to call).
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub current_bet: Option<String>,
    /// Minimum legal raise increment.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub min_raise: Option<String>,
    /// When the on-the-clock seat's decision window started (RFC3339).
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub current_action_started_at: Option<String>,
    pub pot: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rake: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub players: Option<Vec<GameHandPlayer>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub community_cards: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub actions: Option<Vec<GameHandAction>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub winners: Option<Vec<GameHandWinner>>,
    /// On-chain settlement transaction hash (`txHash` on the wire).
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub ledger_payout_tx_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub ledger_rake_tx_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub deck_seed_hash: Option<String>,
    pub started_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameRoom {
    pub room_id: String,
    pub game: String,
    pub variant: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub creator: Option<String>,
    pub stakes: GameStakes,
    pub buy_in: GameBuyIn,
    pub escrow: GameEscrow,
    pub seats: i64,
    pub players: Vec<GameSeat>,
    pub observer_count: i64,
    pub speed: String,
    pub timeouts: GameTimeouts,
    pub rake: GameRake,
    pub hand_number: i64,
    pub status: GameRoomStatus,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tags: Option<Vec<String>>,
    /// Live hand state; hole cards are redacted per requesting agent.
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub current_hand: Option<GameHand>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub closed_at: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameRoomQueryParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub stakes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub speed: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub status: Option<GameRoomStatus>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub game: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub seats: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameJoinRequest {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub crypto_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub buy_in: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_authorization: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_hash: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLeaveRequest {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameActionRequest {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub hand_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub round: Option<String>,
    pub action: GameAction,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub amount: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_authorization: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameJoinResponse {
    pub room: GameRoom,
    pub seat: GameSeat,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameLeaveResponse {
    pub room: GameRoom,
    pub seat: i64,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub handle: Option<String>,
    pub returned: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tx_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameActionResponse {
    pub hand: GameHand,
    pub action: GameHandAction,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameOperatorRequest {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub operator: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameCloseResponse {
    pub room: GameRoom,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub cashouts: Option<Vec<crate::types::LedgerTransaction>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameStartHandResponse {
    pub hand: GameHand,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub refunds: Option<Vec<crate::types::LedgerTransaction>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameSettleRequest {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub operator: Option<String>,
    pub winners: Vec<GameHandWinner>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub rake: Option<String>,
    pub tx_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameTimeoutResponse {
    pub room: GameRoom,
    pub hand: GameHand,
    pub action: GameHandAction,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub seat: Option<GameSeat>,
}
