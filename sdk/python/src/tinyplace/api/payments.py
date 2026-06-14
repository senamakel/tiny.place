from __future__ import annotations

import asyncio

from ..http import HttpClient, encode
from ..types import Json, JsonDict, Query

DEFAULT_VERIFY_ATTEMPTS = 10
DEFAULT_VERIFY_INTERVAL_MS = 2000
DEFAULT_RETRY_ERRORS = ["transaction not found", "insufficient confirmations"]


class PaymentsApi:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    async def verify(self, request: JsonDict) -> Json:
        return await self._http.post("/payments/verify", {"payment": request})

    async def verify_until_valid(self, request: JsonDict, options: JsonDict | None = None) -> Json:
        options = options or {}
        attempts = int(options.get("attempts", DEFAULT_VERIFY_ATTEMPTS))
        interval_ms = int(options.get("intervalMs", DEFAULT_VERIFY_INTERVAL_MS))
        retry_errors = options.get("retryErrors", DEFAULT_RETRY_ERRORS)
        response = await self.verify(request)
        for _ in range(1, attempts):
            if not _should_retry_verify(response, retry_errors):
                return response
            if interval_ms > 0:
                await asyncio.sleep(interval_ms / 1000)
            response = await self.verify(request)
        return response

    async def settle(self, request: JsonDict) -> Json:
        return await self._http.post(
            "/payments/settle",
            {
                "payment": request.get("payment"),
                "settledAmount": request.get("settledAmount"),
                "feeQuoteId": request.get("feeQuoteId"),
                "reference": request.get("reference"),
                "shielded": request.get("shielded"),
                "delegatedTx": request.get("delegatedTx"),
            },
        )

    async def facilitator(self) -> Json:
        return await self._http.get("/payments/facilitator")

    async def supported(self) -> JsonDict:
        return await self._http.get("/payments/supported")

    async def create_subscription(self, subscription: JsonDict) -> Json:
        return await self._http.post("/payments/subscriptions", subscription)

    async def get_subscription(self, subscription_id: str, actor: str | None = None) -> Json:
        path = f"/payments/subscriptions/{encode(subscription_id)}"
        if actor:
            return await self._http.get_directory_auth_as(path, actor)
        return await self._http.get_agent_auth(path)

    async def cancel_subscription(self, subscription_id: str, actor: str | None = None) -> None:
        path = f"/payments/subscriptions/{encode(subscription_id)}"
        if actor:
            await self._http.delete_directory_auth_as(path, actor)
            return
        await self._http.delete_agent_auth(path)

    async def renew_subscription(self, subscription_id: str, request: JsonDict) -> Json:
        return await self._http.post(
            f"/payments/subscriptions/{encode(subscription_id)}/renew",
            request,
        )

    async def renew_due_subscriptions(self, params: Query = None) -> Json:
        return await self._http.post_admin("/payments/subscriptions/renew-due", params)

    async def flush_batch(self, batch_id: str, request: JsonDict) -> Json:
        return await self._http.post_admin(f"/payments/batches/{encode(batch_id)}/flush", request)


def _should_retry_verify(response: Json, retry_errors: list[str]) -> bool:
    if not isinstance(response, dict) or response.get("valid") or response.get("error") is None:
        return False
    error = str(response["error"]).lower()
    return any(retry_error.lower() in error for retry_error in retry_errors)
