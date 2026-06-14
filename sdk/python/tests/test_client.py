from __future__ import annotations

import json
from typing import Any

from tinyplace import LocalSigner, TinyPlaceClient, TinyPlaceError


class FakeResponse:
    def __init__(self, status: int, body: Any, headers: dict[str, str] | None = None) -> None:
        self.status = status
        self._body = body
        self.headers = headers or {}

    async def text(self) -> str:
        return self._body if isinstance(self._body, str) else json.dumps(self._body)


class FakeSession:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.responses = responses
        self.requests: list[dict[str, Any]] = []

    async def request(self, method: str, url: str, **kwargs: Any) -> FakeResponse:
        self.requests.append({"method": method, "url": url, **kwargs})
        return self.responses.pop(0)


async def test_directory_get_agent_builds_expected_request() -> None:
    session = FakeSession([FakeResponse(200, {"agentId": "agent one"})])
    client = TinyPlaceClient(base_url="https://api.example.test/", session=session)  # type: ignore[arg-type]

    result = await client.directory.get_agent("agent one")

    assert result == {"agentId": "agent one"}
    assert session.requests[0]["method"] == "GET"
    assert session.requests[0]["url"] == "https://api.example.test/directory/agents/agent%20one"


async def test_messages_send_uses_directory_actor_and_body() -> None:
    signer = LocalSigner.from_seed(bytes(range(32)))
    session = FakeSession([FakeResponse(200, {"id": "m1"})])
    client = TinyPlaceClient(
        base_url="https://api.example.test",
        signer=signer,
        session=session,  # type: ignore[arg-type]
    )

    await client.messages.send({"id": "m1", "from": "agent-a", "to": "agent-b"})

    request = session.requests[0]
    body = json.loads(request["data"])
    assert request["method"] == "PUT"
    assert request["url"] == "https://api.example.test/messages"
    assert request["headers"]["X-Agent-ID"] == "agent-a"
    assert "timestamp" in body


async def test_error_includes_payment_challenge_from_body() -> None:
    session = FakeSession(
        [
            FakeResponse(
                402,
                {"error": "payment required", "payment": {"scheme": "exact", "amount": "1"}},
            )
        ]
    )
    client = TinyPlaceClient(base_url="https://api.example.test", session=session)  # type: ignore[arg-type]

    try:
        await client.healthz()
    except TinyPlaceError as error:
        assert error.status == 402
        assert error.payment_required is not None
        assert error.payment_required.payment["amount"] == "1"
    else:
        raise AssertionError("expected TinyPlaceError")
