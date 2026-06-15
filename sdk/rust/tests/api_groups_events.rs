//! Endpoint tests for `GroupsApi` and `EventsApi`. Each test points the client
//! at a catch-all mock, invokes a method, and asserts the request method and
//! path. Response bodies are permissive — the goal is to exercise request
//! construction, auth signing, and the response pipeline.

mod common;

use common::*;
use serde_json::json;
use tinyplace::api::events::{EventRecordingUpdate, EventRsvpRequest, EventStagePost};
use tinyplace::types::{
    EventQueryParams, GroupCreateRequest, GroupJoinRequest, GroupMessageFanoutRequest,
    GroupQueryParams, GroupRevenueShareRequest, GroupSubscriptionRenewRequest,
};

// --- GroupsApi ---

#[tokio::test]
async fn groups_list() {
    let server = any_ok(json!({"groups": []})).await;
    let client = client_for(&server);
    let _ = client.groups.list(Some(&GroupQueryParams::default())).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/directory/groups"));
}

#[tokio::test]
async fn groups_get() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.groups.get("grp1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("grp1"));
}

#[tokio::test]
async fn groups_create() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let request: GroupCreateRequest = serde_json::from_value(json!({
        "name": "Group",
        "membershipPolicy": "open"
    }))
    .unwrap();
    let _ = client.groups.create(request).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/directory/groups"));
}

#[tokio::test]
async fn groups_members() {
    let server = any_ok(json!({"members": []})).await;
    let client = client_for(&server);
    let _ = client.groups.members("grp1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("members"));
}

#[tokio::test]
async fn groups_add_member() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.groups.add_member("grp1", "@alice", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("members"));
}

#[tokio::test]
async fn groups_remove_member() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.groups.remove_member("grp1", "@alice", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "DELETE");
    assert!(req.url.path().contains("members"));
}

#[tokio::test]
async fn groups_join() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .groups
        .join("grp1", Some(GroupJoinRequest::default()))
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("join"));
}

#[tokio::test]
async fn groups_approve_member() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.groups.approve_member("grp1", "@alice", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("approve"));
}

#[tokio::test]
async fn groups_reject_member() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.groups.reject_member("grp1", "@alice", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("reject"));
}

#[tokio::test]
async fn groups_renew_member_subscription() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .groups
        .renew_member_subscription(
            "grp1",
            "@alice",
            Some(GroupSubscriptionRenewRequest::default()),
        )
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("subscription/renew"));
}

#[tokio::test]
async fn groups_set_revenue_shares() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let request: GroupRevenueShareRequest = serde_json::from_value(json!({
        "taskId": "t1",
        "payer": "@alice",
        "amount": "1",
        "asset": "USDC",
        "network": "solana",
        "onChainTx": "tx1",
        "participants": []
    }))
    .unwrap();
    let _ = client
        .groups
        .set_revenue_shares("grp1", request, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("revenue-shares"));
}

#[tokio::test]
async fn groups_enforce_subscriptions() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .groups
        .enforce_subscriptions("grp1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("subscriptions/enforce"));
}

#[tokio::test]
async fn groups_fanout_message() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let message: GroupMessageFanoutRequest = serde_json::from_value(json!({
        "id": "m1",
        "from": "@alice",
        "to": "grp1",
        "timestamp": "2026-01-01T00:00:00Z",
        "deviceId": 1,
        "type": "ciphertext",
        "body": "hello"
    }))
    .unwrap();
    let _ = client.groups.fanout_message("grp1", message).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("messages"));
}

// --- EventsApi ---

#[tokio::test]
async fn events_list() {
    let server = any_ok(json!({"events": []})).await;
    let client = client_for(&server);
    let _ = client.events.list(Some(&EventQueryParams::default())).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("/events"));
}

#[tokio::test]
async fn events_create() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.create(json!({"host": "@alice"}), None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("/events"));
}

#[tokio::test]
async fn events_get() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.get("evt1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("evt1"));
}

#[tokio::test]
async fn events_update() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .update("evt1", json!({}), Some("@alice"))
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "PUT");
    assert!(req.url.path().contains("evt1"));
}

#[tokio::test]
async fn events_remove() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.remove("evt1", Some("@alice")).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "DELETE");
    assert!(req.url.path().contains("evt1"));
}

#[tokio::test]
async fn events_rsvp() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .rsvp("evt1", Some(EventRsvpRequest::default()), Some("@alice"))
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("rsvp"));
}

#[tokio::test]
async fn events_cancel_rsvp() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.cancel_rsvp("evt1", Some("@alice")).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "DELETE");
    assert!(req.url.path().contains("rsvp"));
}

#[tokio::test]
async fn events_attendees() {
    let server = any_ok(json!({"attendees": []})).await;
    let client = client_for(&server);
    let _ = client.events.attendees("evt1", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("attendees"));
}

#[tokio::test]
async fn events_remove_attendee() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.remove_attendee("evt1", "@alice", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "DELETE");
    assert!(req.url.path().contains("attendees"));
}

#[tokio::test]
async fn events_invite() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.invite("evt1", "@alice", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("invite"));
}

#[tokio::test]
async fn events_start() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.start("evt1", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("start"));
}

#[tokio::test]
async fn events_end() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.end("evt1", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("end"));
}

#[tokio::test]
async fn events_get_stage() {
    let server = any_ok(json!({"messages": []})).await;
    let client = client_for(&server);
    let _ = client.events.get_stage("evt1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("stage"));
}

#[tokio::test]
async fn events_post_to_stage() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .post_to_stage("evt1", EventStagePost::default(), Some("@alice"))
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("stage"));
}

#[tokio::test]
async fn events_pause_stage() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.pause_stage("evt1", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("stage/pause"));
}

#[tokio::test]
async fn events_resume_stage() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.resume_stage("evt1", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("stage/resume"));
}

#[tokio::test]
async fn events_pin_stage_message() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .pin_stage_message("evt1", "m1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("pin"));
}

#[tokio::test]
async fn events_unpin_stage_message() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .unpin_stage_message("evt1", "m1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("unpin"));
}

#[tokio::test]
async fn events_add_speaker() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.add_speaker("evt1", "@bob", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("speakers"));
}

#[tokio::test]
async fn events_remove_speaker() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.remove_speaker("evt1", "@bob", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "DELETE");
    assert!(req.url.path().contains("speakers"));
}

#[tokio::test]
async fn events_mute_speaker() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.mute_speaker("evt1", "@bob", None, None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("mute"));
}

#[tokio::test]
async fn events_unmute_speaker() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .unmute_speaker("evt1", "@bob", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("unmute"));
}

#[tokio::test]
async fn events_activate_agenda_item() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .activate_agenda_item("evt1", "a1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("agenda"));
}

#[tokio::test]
async fn events_questions() {
    let server = any_ok(json!({"questions": []})).await;
    let client = client_for(&server);
    let _ = client.events.questions("evt1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("questions"));
}

#[tokio::test]
async fn events_post_question() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .post_question("evt1", json!({"asker": "@alice"}), None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("questions"));
}

#[tokio::test]
async fn events_upvote_question() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .upvote_question("evt1", "q1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("upvote"));
}

#[tokio::test]
async fn events_promote_question() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .promote_question("evt1", "q1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("promote"));
}

#[tokio::test]
async fn events_dismiss_question() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .dismiss_question("evt1", "q1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("dismiss"));
}

#[tokio::test]
async fn events_mark_question_answered() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .mark_question_answered("evt1", "q1", None, None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("answered"));
}

#[tokio::test]
async fn events_polls() {
    let server = any_ok(json!({"polls": []})).await;
    let client = client_for(&server);
    let _ = client.events.polls("evt1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("polls"));
}

#[tokio::test]
async fn events_create_poll() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .create_poll("evt1", json!({"createdBy": "@alice"}), None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("polls"));
}

#[tokio::test]
async fn events_vote_poll() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.vote_poll("evt1", "p1", "yes", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("vote"));
}

#[tokio::test]
async fn events_close_poll() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.close_poll("evt1", "p1", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("close"));
}

#[tokio::test]
async fn events_recording() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.recording("evt1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("recording"));
}

#[tokio::test]
async fn events_update_recording() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .update_recording(
            "evt1",
            EventRecordingUpdate {
                visibility: "public".to_string(),
            },
            None,
        )
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "PUT");
    assert!(req.url.path().contains("recording"));
}

#[tokio::test]
async fn events_list_series() {
    let server = any_ok(json!({"series": []})).await;
    let client = client_for(&server);
    let _ = client.events.list_series().await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("series"));
}

#[tokio::test]
async fn events_create_series() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client
        .events
        .create_series(json!({"host": "@alice"}), None)
        .await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("series"));
}

#[tokio::test]
async fn events_get_series() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.get_series("s1").await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "GET");
    assert!(req.url.path().contains("series"));
}

#[tokio::test]
async fn events_follow_series() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.follow_series("s1", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "POST");
    assert!(req.url.path().contains("follow"));
}

#[tokio::test]
async fn events_unfollow_series() {
    let server = any_empty_ok().await;
    let client = client_for(&server);
    let _ = client.events.unfollow_series("s1", None).await;
    let req = only_request(&server).await;
    assert_eq!(req.method.as_str(), "DELETE");
    assert!(req.url.path().contains("follow"));
}
