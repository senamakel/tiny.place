#[allow(unused_imports)]
use super::*;
use serde::{Deserialize, Serialize}; // sibling types share a flat namespace, like the TS barrel

pub type EventStatus = String;
pub type EventVisibility = String;
pub type EventEncryption = String;
pub type EventQuestionStatus = String;
pub type EventPollStatus = String;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventSchedule {
    pub start_at: String,
    pub end_at: String,
    pub timezone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventAgendaItem {
    pub time: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub speaker: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventTicketPrice {
    pub amount: String,
    pub asset: String,
    pub network: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventTicketTier {
    pub tier: String,
    pub amount: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub capacity: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub perks: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventPaymentPolicy {
    #[serde(rename = "type")]
    pub type_: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub ticket: Option<EventTicketPrice>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tiered: Option<Vec<EventTicketTier>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub refund: Option<std::collections::HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub meta: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub event_id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub description: Option<String>,
    #[serde(rename = "type")]
    pub type_: String,
    pub host: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub host_crypto_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub speakers: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub moderators: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub muted_speakers: Option<Vec<String>>,
    pub schedule: EventSchedule,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agenda: Option<Vec<EventAgendaItem>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub current_agenda_index: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub capacity: Option<i64>,
    pub attendee_count: i64,
    pub status: EventStatus,
    pub visibility: EventVisibility,
    pub encryption: EventEncryption,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tags: Option<Vec<String>>,
    pub recording: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub recording_visibility: Option<EventVisibility>,
    pub stage_paused: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub payment_policy: Option<EventPaymentPolicy>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub series_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub cancelled_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub ended_at: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventQueryParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub q: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none", default)]
    pub type_: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub host: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub series_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub status: Option<EventStatus>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub visibility: Option<EventVisibility>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tag: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub from: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub to: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub limit: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventAttendee {
    pub event_id: String,
    pub agent_id: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub tier: Option<String>,
    pub status: String,
    pub joined_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventStageMessage {
    pub message_id: String,
    pub event_id: String,
    pub sender: String,
    pub role: String,
    pub timestamp: String,
    pub content_type: String,
    pub body: String,
    pub pinned: bool,
    pub sequence: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventQuestion {
    pub question_id: String,
    pub event_id: String,
    pub asker: String,
    pub body: String,
    pub submitted_at: String,
    pub status: EventQuestionStatus,
    pub upvotes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventPoll {
    pub poll_id: String,
    pub event_id: String,
    pub question: String,
    pub options: Vec<String>,
    pub created_by: String,
    pub status: EventPollStatus,
    pub results: std::collections::HashMap<String, i64>,
    pub total_votes: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventRecording {
    pub event_id: String,
    pub title: String,
    pub duration: String,
    pub messages: Vec<EventStageMessage>,
    pub questions: Vec<EventQuestion>,
    pub polls: Vec<EventPoll>,
    pub attendee_peak: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventRecurrence {
    pub frequency: String,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub day: Option<String>,
    pub time: String,
    pub timezone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventSeries {
    pub series_id: String,
    pub title: String,
    pub host: String,
    pub recurrence: EventRecurrence,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub next_event_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub followers: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,
}
