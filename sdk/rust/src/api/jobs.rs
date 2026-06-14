//! Jobs marketplace: post + fund, browse, apply, candidate selection (which
//! spawns the escrow contract), and the AI-judged dispute flow. Mirrors
//! `sdk/typescript/src/api/jobs.ts`.

use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::error::Result;
use crate::http::HttpClient;
use crate::types::{
    JobCreateRequest, JobPosting, JobQueryParams, Proposal, ProposalCreateRequest,
    SelectCandidateResult,
};
use crate::util::encode;

/// Response wrapper for [`JobsApi::list`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobListResponse {
    pub jobs: Vec<JobPosting>,
}

/// Response wrapper for [`JobsApi::list_proposals`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProposalListResponse {
    pub proposals: Vec<Proposal>,
}

/// Query params for [`JobsApi::list_proposals`].
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposalQueryParams {
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub offset: Option<i64>,
}

#[derive(Clone)]
pub struct JobsApi {
    http: HttpClient,
}

impl JobsApi {
    pub(crate) fn new(http: HttpClient) -> Self {
        Self { http }
    }

    // --- Postings ---

    pub async fn list(&self, params: Option<&JobQueryParams>) -> Result<JobListResponse> {
        let q = job_query(params);
        self.http.get("/jobs", &q).await
    }

    pub async fn get(&self, job_id: &str) -> Result<JobPosting> {
        self.http
            .get(&format!("/jobs/{}", encode(job_id)), &[])
            .await
    }

    pub async fn create(&self, request: &JobCreateRequest) -> Result<JobPosting> {
        self.http
            .post_directory_auth_as("/jobs", &request.client, Some(request))
            .await
    }

    pub async fn cancel(&self, job_id: &str, actor: &str) -> Result<JobPosting> {
        self.http
            .post_directory_auth_as(
                &format!("/jobs/{}/cancel", encode(job_id)),
                actor,
                Some(&json!({ "actor": actor })),
            )
            .await
    }

    // --- Proposals ---

    pub async fn apply(
        &self,
        job_id: &str,
        request: &ProposalCreateRequest,
    ) -> Result<Proposal> {
        self.http
            .post_directory_auth_as(
                &format!("/jobs/{}/proposals", encode(job_id)),
                &request.candidate,
                Some(request),
            )
            .await
    }

    /// Restricted to the posting's client.
    pub async fn list_proposals(
        &self,
        job_id: &str,
        client: &str,
        params: Option<&ProposalQueryParams>,
    ) -> Result<ProposalListResponse> {
        let q = proposal_query(params);
        self.http
            .get_directory_auth_as(&format!("/jobs/{}/proposals", encode(job_id)), client, &q)
            .await
    }

    pub async fn get_proposal(
        &self,
        job_id: &str,
        proposal_id: &str,
        actor: &str,
    ) -> Result<Proposal> {
        self.http
            .get_directory_auth_as(
                &format!(
                    "/jobs/{}/proposals/{}",
                    encode(job_id),
                    encode(proposal_id)
                ),
                actor,
                &[],
            )
            .await
    }

    pub async fn shortlist_proposal(
        &self,
        job_id: &str,
        proposal_id: &str,
        client: &str,
    ) -> Result<Proposal> {
        self.http
            .post_directory_auth_as(
                &format!(
                    "/jobs/{}/proposals/{}/shortlist",
                    encode(job_id),
                    encode(proposal_id)
                ),
                client,
                Some(&json!({ "actor": client })),
            )
            .await
    }

    pub async fn withdraw_proposal(
        &self,
        job_id: &str,
        proposal_id: &str,
        candidate: &str,
    ) -> Result<Proposal> {
        self.http
            .post_directory_auth_as(
                &format!(
                    "/jobs/{}/proposals/{}/withdraw",
                    encode(job_id),
                    encode(proposal_id)
                ),
                candidate,
                Some(&json!({ "actor": candidate })),
            )
            .await
    }

    // --- Selection (spawns the escrow contract) ---

    pub async fn select(
        &self,
        job_id: &str,
        client: &str,
        proposal_id: &str,
        network: Option<&str>,
    ) -> Result<SelectCandidateResult> {
        // TS sends `{ actor, proposalId, network }`; `network: undefined` is
        // dropped by JSON.stringify, so omit the key when it is absent.
        let mut body = serde_json::Map::new();
        body.insert("actor".to_string(), json!(client));
        body.insert("proposalId".to_string(), json!(proposal_id));
        if let Some(network) = network {
            body.insert("network".to_string(), json!(network));
        }
        let body = serde_json::Value::Object(body);
        self.http
            .post_directory_auth_as(
                &format!("/jobs/{}/select", encode(job_id)),
                client,
                Some(&body),
            )
            .await
    }

    // --- Disputes (AI judge panel) ---

    pub async fn open_dispute(
        &self,
        job_id: &str,
        actor: &str,
        reason: &str,
    ) -> Result<JobPosting> {
        self.http
            .post_directory_auth_as(
                &format!("/jobs/{}/dispute", encode(job_id)),
                actor,
                Some(&json!({ "actor": actor, "reason": reason })),
            )
            .await
    }

    /// Convenes the AI judge panel and applies its verdict.
    pub async fn adjudicate_dispute(&self, job_id: &str, actor: &str) -> Result<JobPosting> {
        self.http
            .post_directory_auth_as(
                &format!("/jobs/{}/dispute/adjudicate", encode(job_id)),
                actor,
                Some(&json!({ "actor": actor })),
            )
            .await
    }
}

fn job_query(params: Option<&JobQueryParams>) -> Vec<(String, String)> {
    let mut q: Vec<(String, String)> = Vec::new();
    if let Some(p) = params {
        if let Some(v) = &p.client {
            q.push(("client".into(), v.clone()));
        }
        if let Some(v) = &p.status {
            q.push(("status".into(), v.clone()));
        }
        if let Some(v) = &p.category {
            q.push(("category".into(), v.clone()));
        }
        if let Some(v) = &p.skill {
            q.push(("skill".into(), v.clone()));
        }
        if let Some(v) = p.limit {
            q.push(("limit".into(), v.to_string()));
        }
        if let Some(v) = p.offset {
            q.push(("offset".into(), v.to_string()));
        }
    }
    q
}

fn proposal_query(params: Option<&ProposalQueryParams>) -> Vec<(String, String)> {
    let mut q: Vec<(String, String)> = Vec::new();
    if let Some(p) = params {
        if let Some(v) = &p.status {
            q.push(("status".into(), v.clone()));
        }
        if let Some(v) = p.limit {
            q.push(("limit".into(), v.to_string()));
        }
        if let Some(v) = p.offset {
            q.push(("offset".into(), v.to_string()));
        }
    }
    q
}
