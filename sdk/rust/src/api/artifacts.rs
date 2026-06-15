//! Encrypted artifact storage (`/artifacts`). All operations use directory-write
//! auth (optionally acting as a specified owner/actor).

use crate::error::Result;
use crate::http::HttpClient;
use crate::types::{
    Artifact, ArtifactCreateRequest, ArtifactListResult, ArtifactQueryParams,
    ArtifactRecipientUpdate,
};
use crate::util::encode;

#[derive(Clone)]
pub struct ArtifactsApi {
    http: HttpClient,
}

impl ArtifactsApi {
    pub(crate) fn new(http: HttpClient) -> Self {
        Self { http }
    }

    pub async fn list(
        &self,
        params: Option<&ArtifactQueryParams>,
        actor_id: Option<&str>,
    ) -> Result<ArtifactListResult> {
        let q = artifact_query(params);
        match actor_id {
            Some(actor) => {
                self.http
                    .get_directory_auth_as("/artifacts", actor, &q)
                    .await
            }
            None => self.http.get_directory_auth("/artifacts", &q).await,
        }
    }

    pub async fn create(
        &self,
        request: &ArtifactCreateRequest,
        owner_id: Option<&str>,
    ) -> Result<Artifact> {
        match owner_id {
            Some(owner) => {
                self.http
                    .post_directory_auth_as("/artifacts", owner, Some(request))
                    .await
            }
            None => {
                self.http
                    .post_directory_auth("/artifacts", Some(request))
                    .await
            }
        }
    }

    pub async fn get(&self, artifact_id: &str, actor_id: Option<&str>) -> Result<Artifact> {
        let path = format!("/artifacts/{}", encode(artifact_id));
        match actor_id {
            Some(actor) => self.http.get_directory_auth_as(&path, actor, &[]).await,
            None => self.http.get_directory_auth(&path, &[]).await,
        }
    }

    pub async fn remove(&self, artifact_id: &str, owner_id: Option<&str>) -> Result<()> {
        let path = format!("/artifacts/{}", encode(artifact_id));
        match owner_id {
            Some(owner) => {
                self.http
                    .delete_directory_auth_as::<(), serde_json::Value>(&path, owner, None)
                    .await
            }
            None => {
                self.http
                    .delete_directory_auth::<(), serde_json::Value>(&path, None)
                    .await
            }
        }
    }

    /// Downloads the artifact's raw bytes. The caller reads the returned response.
    pub async fn download(
        &self,
        artifact_id: &str,
        actor_id: Option<&str>,
    ) -> Result<reqwest::Response> {
        let path = format!("/artifacts/{}/download", encode(artifact_id));
        match actor_id {
            Some(actor) => self.http.get_directory_auth_raw_as(&path, actor, &[]).await,
            None => self.http.get_directory_auth_raw(&path, &[]).await,
        }
    }

    pub async fn update_recipients(
        &self,
        artifact_id: &str,
        request: &ArtifactRecipientUpdate,
        owner_id: Option<&str>,
    ) -> Result<Artifact> {
        let path = format!("/artifacts/{}/recipients", encode(artifact_id));
        match owner_id {
            Some(owner) => {
                self.http
                    .put_directory_auth_as(&path, owner, Some(request))
                    .await
            }
            None => self.http.put_directory_auth(&path, Some(request)).await,
        }
    }
}

fn artifact_query(params: Option<&ArtifactQueryParams>) -> Vec<(String, String)> {
    let mut q: Vec<(String, String)> = Vec::new();
    if let Some(p) = params {
        if let Some(v) = &p.role {
            q.push(("role".into(), v.clone()));
        }
        if let Some(v) = &p.status {
            q.push(("status".into(), v.clone()));
        }
        if let Some(v) = &p.reference_kind {
            q.push(("referenceKind".into(), v.clone()));
        }
        if let Some(v) = &p.reference_id {
            q.push(("referenceId".into(), v.clone()));
        }
        if let Some(v) = p.limit {
            q.push(("limit".into(), v.to_string()));
        }
        if let Some(v) = &p.cursor {
            q.push(("cursor".into(), v.clone()));
        }
    }
    q
}
