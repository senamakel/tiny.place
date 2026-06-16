//! WebSocket streaming client. Mirrors `sdk/typescript/src/websocket.ts`.
//!
//! The TypeScript SDK exposes streaming endpoints as a `TinyPlaceWebSocket` with
//! `on(event, handler)` callbacks. This port offers the same callback model in
//! an async, `tokio`-native shape: build a [`WebSocketStream`] from a `stream()`
//! method, attach callbacks, then [`WebSocketStream::connect`] to spawn a
//! background task that reads frames and invokes your callbacks. The returned
//! [`WebSocketConnection`] can `send` frames and `close` the socket; dropping it
//! also closes the socket.
//!
//! Frames are JSON. Every frame is delivered to the `on_message` callback as a
//! [`serde_json::Value`]; frames that carry a string `type` field are *also*
//! dispatched to any matching `on(type, ..)` callback, mirroring the TS
//! `emit(data.type, data)` behavior.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use tokio::sync::{mpsc, Notify};
use tokio_tungstenite::tungstenite::Message;

use crate::auth::{generate_nonce, sign_request, timestamp};
use crate::crypto::{sha256_hex, to_base64};
use crate::error::{Error, Result};
use crate::http::HttpClient;
use crate::signer::Signer;
use crate::util::encode;

/// A callback invoked with a decoded JSON frame.
pub type MessageHandler = Arc<dyn Fn(serde_json::Value) + Send + Sync>;
/// A callback invoked on lifecycle events (open/close).
pub type LifecycleHandler = Arc<dyn Fn() + Send + Sync>;
/// A callback invoked with a connection error message.
pub type ErrorHandler = Arc<dyn Fn(String) + Send + Sync>;

/// A configured-but-not-yet-connected stream. Attach callbacks, then call
/// [`WebSocketStream::connect`].
pub struct WebSocketStream {
    ws_url: String,
    signer: Option<Arc<dyn Signer>>,
    directory_auth: Option<String>,
    reconnect: bool,
    reconnect_interval: Duration,
    max_reconnect_attempts: u32,
    on_message: Option<MessageHandler>,
    typed_handlers: HashMap<String, MessageHandler>,
    on_open: Option<LifecycleHandler>,
    on_close: Option<LifecycleHandler>,
    on_error: Option<ErrorHandler>,
}

impl WebSocketStream {
    /// Build a stream for `path` (e.g. `/activity/stream?limit=5`) using `http`'s
    /// base URL and signer. `directory_auth` requests the directory-write query
    /// signing used by agent-scoped streams; it is a no-op without a signer.
    pub(crate) fn new(http: &HttpClient, path: &str, directory_auth: bool) -> Self {
        let ws_base = http_to_ws(http.base_url());
        let signer = http.signer();
        let directory_auth = if directory_auth {
            signer.as_ref().map(|s| s.public_key_base64())
        } else {
            None
        };
        Self {
            ws_url: format!("{ws_base}{path}"),
            signer,
            directory_auth,
            reconnect: true,
            reconnect_interval: Duration::from_millis(3000),
            max_reconnect_attempts: 10,
            on_message: None,
            typed_handlers: HashMap::new(),
            on_open: None,
            on_close: None,
            on_error: None,
        }
    }

    /// Register a callback for every decoded frame.
    pub fn on_message<F>(mut self, handler: F) -> Self
    where
        F: Fn(serde_json::Value) + Send + Sync + 'static,
    {
        self.on_message = Some(Arc::new(handler));
        self
    }

    /// Register a callback for frames whose `type` field equals `event`.
    pub fn on<F>(mut self, event: impl Into<String>, handler: F) -> Self
    where
        F: Fn(serde_json::Value) + Send + Sync + 'static,
    {
        self.typed_handlers.insert(event.into(), Arc::new(handler));
        self
    }

    /// Register a callback invoked each time the socket opens (incl. reconnects).
    pub fn on_open<F>(mut self, handler: F) -> Self
    where
        F: Fn() + Send + Sync + 'static,
    {
        self.on_open = Some(Arc::new(handler));
        self
    }

    /// Register a callback invoked each time the socket closes.
    pub fn on_close<F>(mut self, handler: F) -> Self
    where
        F: Fn() + Send + Sync + 'static,
    {
        self.on_close = Some(Arc::new(handler));
        self
    }

    /// Register a callback invoked with a description of any connection error.
    pub fn on_error<F>(mut self, handler: F) -> Self
    where
        F: Fn(String) + Send + Sync + 'static,
    {
        self.on_error = Some(Arc::new(handler));
        self
    }

    /// Enable or disable automatic reconnection (default: enabled).
    pub fn reconnect(mut self, reconnect: bool) -> Self {
        self.reconnect = reconnect;
        self
    }

    /// Set the delay between reconnect attempts (default: 3s).
    pub fn reconnect_interval(mut self, interval: Duration) -> Self {
        self.reconnect_interval = interval;
        self
    }

    /// Set the maximum number of reconnect attempts (default: 10).
    pub fn max_reconnect_attempts(mut self, attempts: u32) -> Self {
        self.max_reconnect_attempts = attempts;
        self
    }

    /// Connect and spawn the background read/write task. Resolves once the first
    /// connection is established (or returns the connection error). The returned
    /// [`WebSocketConnection`] keeps the socket alive until closed or dropped.
    pub async fn connect(self) -> Result<WebSocketConnection> {
        // Establish the first connection synchronously so callers see immediate
        // connect errors (mirrors the TS `connect()` promise).
        let first_url = self.authed_url().await?;
        let (stream, _) = tokio_tungstenite::connect_async(&first_url)
            .await
            .map_err(|e| Error::Rpc(format!("websocket connect failed: {e}")))?;

        let (send_tx, send_rx) = mpsc::unbounded_channel::<serde_json::Value>();
        let close = Arc::new(Notify::new());
        let closed = Arc::new(AtomicBool::new(false));

        let task = WsTask {
            config: self,
            send_rx,
            close: close.clone(),
            closed: closed.clone(),
        };
        let handle = tokio::spawn(task.run(stream));

        Ok(WebSocketConnection {
            send_tx,
            close,
            closed,
            handle: Some(handle),
        })
    }

    /// Build the (possibly auth-signed) WebSocket URL for one connection attempt.
    async fn authed_url(&self) -> Result<String> {
        match (&self.signer, &self.directory_auth) {
            (Some(signer), Some(public_key)) => {
                sign_directory_write_url(signer.as_ref(), public_key, &self.ws_url).await
            }
            (Some(signer), None) => {
                let headers = sign_request(signer.as_ref(), "").await?;
                let authorization = headers
                    .into_iter()
                    .find(|(k, _)| k == "Authorization")
                    .map(|(_, v)| v)
                    .unwrap_or_default();
                let separator = if self.ws_url.contains('?') { '&' } else { '?' };
                Ok(format!(
                    "{}{}authorization={}",
                    self.ws_url,
                    separator,
                    encode(&authorization)
                ))
            }
            _ => Ok(self.ws_url.clone()),
        }
    }
}

/// A live WebSocket connection. Send frames with [`WebSocketConnection::send`]
/// and shut down with [`WebSocketConnection::close`]; dropping also closes it.
pub struct WebSocketConnection {
    send_tx: mpsc::UnboundedSender<serde_json::Value>,
    close: Arc<Notify>,
    closed: Arc<AtomicBool>,
    handle: Option<tokio::task::JoinHandle<()>>,
}

impl WebSocketConnection {
    /// Send a JSON frame to the server (no-op once closed).
    pub fn send(&self, value: serde_json::Value) {
        let _ = self.send_tx.send(value);
    }

    /// Close the socket and stop the background task.
    pub fn close(&self) {
        self.closed.store(true, Ordering::SeqCst);
        self.close.notify_waiters();
    }

    /// Wait for the background task to finish (after a close or terminal error).
    pub async fn closed(mut self) {
        if let Some(handle) = self.handle.take() {
            let _ = handle.await;
        }
    }
}

impl Drop for WebSocketConnection {
    fn drop(&mut self) {
        self.closed.store(true, Ordering::SeqCst);
        self.close.notify_waiters();
    }
}

struct WsTask {
    config: WebSocketStream,
    send_rx: mpsc::UnboundedReceiver<serde_json::Value>,
    close: Arc<Notify>,
    closed: Arc<AtomicBool>,
}

impl WsTask {
    async fn run(mut self, initial: WsSocket) {
        let mut socket = Some(initial);
        let mut attempts: u32 = 0;

        loop {
            if self.closed.load(Ordering::SeqCst) {
                break;
            }

            // (Re)establish the socket if needed.
            let stream = match socket.take() {
                Some(s) => s,
                None => match self.config.authed_url().await {
                    Ok(url) => match tokio_tungstenite::connect_async(&url).await {
                        Ok((s, _)) => s,
                        Err(e) => {
                            self.emit_error(format!("websocket reconnect failed: {e}"));
                            if !self.should_reconnect(&mut attempts).await {
                                break;
                            }
                            continue;
                        }
                    },
                    Err(e) => {
                        self.emit_error(format!("websocket auth failed: {e}"));
                        if !self.should_reconnect(&mut attempts).await {
                            break;
                        }
                        continue;
                    }
                },
            };

            attempts = 0;
            if let Some(handler) = &self.config.on_open {
                handler();
            }

            let clean_close = self.pump(stream).await;
            if let Some(handler) = &self.config.on_close {
                handler();
            }
            if clean_close || !self.should_reconnect(&mut attempts).await {
                break;
            }
        }
    }

    /// Read/write loop for one connection. Returns `true` if it ended because the
    /// caller closed the connection (no reconnect should follow).
    async fn pump(&mut self, mut stream: WsSocket) -> bool {
        loop {
            tokio::select! {
                _ = self.close.notified() => {
                    let _ = stream.send(Message::Close(None)).await;
                    return true;
                }
                outbound = self.send_rx.recv() => {
                    match outbound {
                        Some(value) => {
                            let text = value.to_string();
                            if stream.send(Message::Text(text)).await.is_err() {
                                return false;
                            }
                        }
                        None => return true, // all senders dropped
                    }
                }
                inbound = stream.next() => {
                    match inbound {
                        Some(Ok(Message::Text(text))) => self.dispatch(&text),
                        Some(Ok(Message::Binary(bytes))) => {
                            if let Ok(text) = String::from_utf8(bytes) {
                                self.dispatch(&text);
                            }
                        }
                        Some(Ok(Message::Close(_))) | None => return false,
                        Some(Ok(_)) => {} // ping/pong/frame: handled by tungstenite
                        Some(Err(e)) => {
                            self.emit_error(format!("websocket read error: {e}"));
                            return false;
                        }
                    }
                }
            }
        }
    }

    fn dispatch(&self, text: &str) {
        match serde_json::from_str::<serde_json::Value>(text) {
            Ok(value) => {
                if let Some(handler) = &self.config.on_message {
                    handler(value.clone());
                }
                if let Some(type_) = value.get("type").and_then(|t| t.as_str()) {
                    if let Some(handler) = self.config.typed_handlers.get(type_) {
                        handler(value);
                    }
                }
            }
            Err(_) => {
                // Non-JSON frame: surface the raw string like the TS fallback.
                if let Some(handler) = &self.config.on_message {
                    handler(serde_json::Value::String(text.to_string()));
                }
            }
        }
    }

    fn emit_error(&self, message: String) {
        if let Some(handler) = &self.config.on_error {
            handler(message);
        }
    }

    /// Sleep and decide whether another reconnect attempt is allowed.
    async fn should_reconnect(&self, attempts: &mut u32) -> bool {
        if self.closed.load(Ordering::SeqCst)
            || !self.config.reconnect
            || *attempts >= self.config.max_reconnect_attempts
        {
            return false;
        }
        *attempts += 1;
        tokio::select! {
            _ = self.close.notified() => false,
            _ = tokio::time::sleep(self.config.reconnect_interval) => {
                !self.closed.load(Ordering::SeqCst)
            }
        }
    }
}

type WsSocket =
    tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>;

/// Build a `?a=b&c=d` suffix (empty when there are no params) for a stream path.
/// Values are `encodeURIComponent`-escaped; order is preserved (the directory
/// signer re-sorts when signing, and unauthenticated streams ignore order).
pub(crate) fn query_suffix(pairs: &[(String, String)]) -> String {
    if pairs.is_empty() {
        return String::new();
    }
    let query = pairs
        .iter()
        .map(|(k, v)| format!("{}={}", encode(k), encode(v)))
        .collect::<Vec<_>>()
        .join("&");
    format!("?{query}")
}

/// Convert an `http(s)://` base URL to its `ws(s)://` equivalent.
fn http_to_ws(base_url: &str) -> String {
    if let Some(rest) = base_url.strip_prefix("https") {
        format!("wss{rest}")
    } else if let Some(rest) = base_url.strip_prefix("http") {
        format!("ws{rest}")
    } else {
        base_url.to_string()
    }
}

/// Replicates the TS `signDirectoryWriteQuery`: embed `X-TinyPlace-*` auth params
/// (sorted, URL-encoded) into the query string and sign over the canonical
/// `GET\n<request-uri>\n<ts>\n<nonce>\n<body-hash>` message.
async fn sign_directory_write_url(
    signer: &dyn Signer,
    public_key_base64: &str,
    ws_url: &str,
) -> Result<String> {
    let parsed = url::Url::parse(ws_url)
        .map_err(|e| Error::InvalidArgument(format!("invalid websocket url: {e}")))?;
    let origin = format!("{}://{}", parsed.scheme(), parsed.authority());
    let request_uri = match parsed.query() {
        Some(q) => format!("{}?{}", parsed.path(), q),
        None => parsed.path().to_string(),
    };

    let ts = timestamp();
    let nonce = generate_nonce();
    let unsigned_uri = with_query_params(
        &request_uri,
        &[
            ("X-TinyPlace-Date", &ts),
            ("X-TinyPlace-Nonce", &nonce),
            ("X-TinyPlace-Public-Key", public_key_base64),
        ],
    );
    let body_hash = sha256_hex(&[]);
    let signing_payload = format!("GET\n{unsigned_uri}\n{ts}\n{nonce}\n{body_hash}");
    let signature = signer.sign(signing_payload.as_bytes()).await?;
    let signed_uri = with_query_params(
        &unsigned_uri,
        &[("X-TinyPlace-Signature", &to_base64(&signature))],
    );
    Ok(format!("{origin}{signed_uri}"))
}

/// Merge `params` into `request_uri`'s query and re-emit a sorted, URL-encoded
/// query string, mirroring the TS `withQueryParams`/`sortedQueryString` pair.
fn with_query_params(request_uri: &str, params: &[(&str, &str)]) -> String {
    let base = url::Url::parse("https://tinyplace.local")
        .expect("static base url")
        .join(request_uri)
        .expect("join request uri");

    let mut pairs: Vec<(String, String)> = base
        .query_pairs()
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();
    for (key, value) in params {
        pairs.retain(|(k, _)| k != key);
        pairs.push(((*key).to_string(), (*value).to_string()));
    }
    // Sort by raw byte order to match the backend, which reconstructs the signed
    // URI with Go's `url.Values.Encode()` (a `sort.Strings` byte-order sort over
    // the keys). For the ASCII parameter names and values used here (RFC3339
    // timestamps, base64 signatures/keys) this encoding coincides with
    // `encodeURIComponent`, so the signed string round-trips through the
    // backend's decode + re-encode unchanged.
    pairs.sort_by(|(a, _), (b, _)| a.cmp(b));

    let query = pairs
        .iter()
        .map(|(k, v)| format!("{}={}", encode(k), encode(v)))
        .collect::<Vec<_>>()
        .join("&");

    if query.is_empty() {
        base.path().to_string()
    } else {
        format!("{}?{}", base.path(), query)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::http::{HttpClient, HttpClientOptions};
    use crate::signer::LocalSigner;
    use std::sync::Arc;

    #[test]
    fn http_base_becomes_ws() {
        assert_eq!(http_to_ws("http://localhost:8080"), "ws://localhost:8080");
        assert_eq!(
            http_to_ws("https://staging-api.tiny.place"),
            "wss://staging-api.tiny.place"
        );
    }

    #[test]
    fn query_params_sort_by_byte_order() {
        // Uppercase `X-*` keys sort before lowercase `limit` in byte order, the
        // same canonicalization Go's url.Values.Encode() applies server-side.
        let uri = with_query_params(
            "/channels/c1/stream?limit=5",
            &[
                ("X-Agent-ID", "@alice"),
                ("X-TinyPlace-Date", "2026-01-01T00:00:00Z"),
            ],
        );
        assert_eq!(
            uri,
            "/channels/c1/stream?X-Agent-ID=%40alice&X-TinyPlace-Date=2026-01-01T00%3A00%3A00Z&limit=5"
        );
    }

    #[tokio::test]
    async fn directory_write_url_carries_signed_query_params() {
        let signer = LocalSigner::from_seed(&[7u8; 32]).unwrap();
        let pubkey = signer.public_key_base64();
        let url = sign_directory_write_url(&signer, &pubkey, "wss://host/a2a/@a/stream")
            .await
            .unwrap();
        assert!(url.starts_with("wss://host/a2a/@a/stream?"));
        for key in [
            "X-TinyPlace-Date",
            "X-TinyPlace-Nonce",
            "X-TinyPlace-Public-Key",
            "X-TinyPlace-Signature",
        ] {
            assert!(url.contains(key), "missing {key} in {url}");
        }
    }

    #[test]
    fn unauthenticated_url_is_unchanged() {
        let http = HttpClient::new(HttpClientOptions {
            base_url: "http://localhost:8080".into(),
            ..Default::default()
        });
        let stream = WebSocketStream::new(&http, "/explorer/live", false);
        assert_eq!(stream.ws_url, "ws://localhost:8080/explorer/live");
        assert!(stream.signer.is_none());
        assert!(stream.directory_auth.is_none());
    }

    /// End-to-end (offline): a local WebSocket server pushes a JSON frame and the
    /// callback receives it, exercising connect → read → dispatch → close.
    #[tokio::test]
    async fn connects_and_dispatches_frames() {
        use futures_util::SinkExt as _;
        use tokio::net::TcpListener;

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            let (socket, _) = listener.accept().await.unwrap();
            let mut ws = tokio_tungstenite::accept_async(socket).await.unwrap();
            ws.send(Message::Text(
                serde_json::json!({"type": "activity", "data": {"n": 1}}).to_string(),
            ))
            .await
            .unwrap();
            // Hold the connection briefly so the client can read before close.
            tokio::time::sleep(Duration::from_millis(100)).await;
        });

        let http = HttpClient::new(HttpClientOptions {
            base_url: format!("http://{addr}"),
            ..Default::default()
        });

        let (tx, rx) = std::sync::mpsc::channel::<serde_json::Value>();
        let tx = Arc::new(std::sync::Mutex::new(tx));
        let conn = WebSocketStream::new(&http, "/activity/stream", false)
            .reconnect(false)
            .on("activity", move |value| {
                let _ = tx.lock().unwrap().send(value);
            })
            .connect()
            .await
            .expect("connect to local ws server");

        let received =
            tokio::task::spawn_blocking(move || rx.recv_timeout(std::time::Duration::from_secs(2)))
                .await
                .unwrap()
                .expect("a frame should arrive");

        assert_eq!(received["type"], "activity");
        assert_eq!(received["data"]["n"], 1);

        conn.close();
        let _ = server.await;
    }
}
