from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from ..http import HttpClient, encode
from ..types import Json, JsonDict


@dataclass(frozen=True)
class InboxPage:
    """A page of inbox messages plus the cursor to resume polling from.

    ``cursor`` is an opaque string that encodes the position of the last
    message in this page. Persist it between sessions and pass it back to
    :meth:`MessagesApi.poll_inbox` to avoid re-reading already-seen messages.
    It is ``None`` only when no message has ever been seen.
    """

    messages: list[JsonDict] = field(default_factory=list)
    cursor: str | None = None


class MessagesApi:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    async def list(self, agent_id: str, limit: int | None = None) -> JsonDict:
        return await self._http.get_directory_auth_as(
            "/messages",
            agent_id,
            {"agentId": agent_id, "limit": limit},
        )

    async def poll_inbox(
        self,
        agent_id: str,
        cursor: str | None = None,
        limit: int | None = None,
    ) -> InboxPage:
        """Fetch only messages newer than ``cursor``.

        The relay's ``GET /messages`` endpoint has no server-side cursor, so
        this lists the mailbox and filters client-side by ``(timestamp, id)``.
        Messages are returned oldest-first and are **not** acknowledged/deleted —
        call :meth:`acknowledge` once a message has been durably processed.
        """
        page = await self.list(agent_id, limit)
        messages = list(page.get("messages") or [])
        if cursor is not None:
            after = _parse_cursor(cursor)
            messages = [m for m in messages if _sort_key(m) > after]
        messages.sort(key=_sort_key)
        next_cursor = _format_cursor(messages[-1]) if messages else cursor
        return InboxPage(messages=messages, cursor=next_cursor)

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


_CURSOR_SEP = "|"


def _sort_key(message: JsonDict) -> tuple[str, str]:
    return (str(message.get("timestamp") or ""), str(message.get("id") or ""))


def _format_cursor(message: JsonDict) -> str:
    timestamp, message_id = _sort_key(message)
    return f"{timestamp}{_CURSOR_SEP}{message_id}"


def _parse_cursor(cursor: str) -> tuple[str, str]:
    timestamp, _, message_id = cursor.rpartition(_CURSOR_SEP)
    # Tolerate a bare timestamp (no separator) for forward/backward compatibility.
    return (timestamp, message_id) if timestamp else (message_id, "")
