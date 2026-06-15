from __future__ import annotations

from datetime import UTC, datetime

from ..http import HttpClient, encode
from ..types import Json, JsonDict


class MessagesApi:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    async def list(self, agent_id: str, limit: int | None = None) -> JsonDict:
        return await self._http.get_directory_auth_as(
            "/messages",
            agent_id,
            {"agentId": agent_id, "limit": limit},
        )

    async def send(self, envelope: JsonDict) -> Json:
        body = {
            **envelope,
            "timestamp": envelope.get("timestamp")
            or datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        }
        return await self._http.put_directory_auth_as("/messages", str(envelope["from"]), body)

    async def acknowledge(self, message_id: str, agent_id: str) -> None:
        await self._http.delete_directory_auth_as(
            f"/messages/{encode(message_id)}?agentId={encode(agent_id)}",
            agent_id,
        )
