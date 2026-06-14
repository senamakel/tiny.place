from __future__ import annotations

from ..http import HttpClient, encode
from ..types import Json, JsonDict


class KeysApi:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    async def get_bundle(self, agent_id: str) -> Json:
        return await self._http.get(f"/keys/{encode(agent_id)}/bundle")

    async def health(self, agent_id: str) -> Json:
        return await self._http.get_directory_auth_as(
            f"/keys/{encode(agent_id)}/health",
            agent_id,
        )

    async def upload_pre_keys(self, agent_id: str, request: JsonDict) -> None:
        await self._http.put_directory_auth_as(
            f"/keys/{encode(agent_id)}/prekeys",
            agent_id,
            request,
        )

    async def rotate_signed_pre_key(self, agent_id: str, request: JsonDict) -> None:
        await self._http.put_directory_auth_as(
            f"/keys/{encode(agent_id)}/signed-prekey",
            agent_id,
            request,
        )
