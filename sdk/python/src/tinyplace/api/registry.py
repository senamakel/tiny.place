from __future__ import annotations

import asyncio
from typing import Any

from ..auth import sign_fresh_canonical_payload
from ..crypto import canonical_payload
from ..http import HttpClient, TinyPlaceError, encode
from ..signer import Signer
from ..solana import SOLANA_MAINNET_NETWORK, USDC_DECIMALS, execute_solana_x402_payment
from ..types import Json, JsonDict

DEFAULT_REGISTRATION_ATTEMPTS = 30
DEFAULT_REGISTRATION_INTERVAL_MS = 3000
DEFAULT_REGISTRATION_RETRY_ERRORS = ["transaction not found", "insufficient confirmations"]


class RegistryApi:
    def __init__(self, http: HttpClient, signer: Signer | None = None) -> None:
        self._http = http
        self._signer = signer

    async def register(self, request: JsonDict) -> Json:
        request = {**request, "username": _normalize_handle(str(request["username"]))}
        if self._signer and not request.get("signature"):
            request["signature"] = await sign_fresh_canonical_payload(
                self._signer,
                _registration_signature_payload(request),
            )
        return await self._http.post_public("/registry/names", request)

    async def register_with_solana_payment(
        self,
        request: JsonDict,
        *,
        rpc_url: str,
        secret_key: str | bytes,
        mint: str | None = None,
        decimals: int = USDC_DECIMALS,
        network: str | None = None,
        attempts: int = DEFAULT_REGISTRATION_ATTEMPTS,
        interval_ms: int = DEFAULT_REGISTRATION_INTERVAL_MS,
    ) -> JsonDict:
        """Register ``request``, settling the x402 fee with an on-chain Solana payment.

        Probes the registration to read the 402 payment challenge, executes the
        SPL/USDC (or native-SOL) transfer on chain, then retries the
        registration with the signed x402 payment map attached — polling through
        the brief window where the chain hasn't yet confirmed the transfer.
        Mirrors the TS SDK's ``registerWithSolanaPayment``.
        """
        if self._signer is None:
            raise ValueError("register_with_solana_payment requires a signer")
        normalized = {**request, "username": _normalize_handle(str(request["username"]))}
        challenge = await self._registration_payment_challenge(normalized)
        amount = challenge.get("amount")
        recipient = challenge.get("to")
        if not amount or not recipient:
            raise ValueError("registration payment challenge is missing amount or recipient")

        execution = await execute_solana_x402_payment(
            signer=self._signer,
            rpc_url=rpc_url,
            secret_key=secret_key,
            mint=mint,
            decimals=decimals,
            payment={
                "scheme": challenge.get("scheme", "exact"),
                "network": challenge.get("network") or network or SOLANA_MAINNET_NETWORK,
                "asset": challenge.get("asset") or "USDC",
                "amount": amount,
                "from": normalized.get("cryptoId") or self._signer.agent_id,
                "to": recipient,
                "nonce": challenge.get("nonce"),
                "expiresAt": challenge.get("expiresAt"),
                "metadata": {
                    **(challenge.get("metadata") or {}),
                    "identity": normalized["username"],
                    "purpose": "registration",
                },
                "publicKeyBase64": normalized.get("publicKey"),
            },
        )
        identity = await self._register_retrying_payment(
            {**normalized, "payment": execution["payment"]}, attempts, interval_ms
        )
        return {
            "identity": identity,
            "payment": execution["payment"],
            "onChainTx": execution["signature"],
        }

    async def _registration_payment_challenge(self, request: JsonDict) -> dict[str, Any]:
        try:
            await self.register(request)
        except TinyPlaceError as exc:
            if exc.status == 402 and exc.payment_required is not None:
                return exc.payment_required.payment
            raise
        raise ValueError("registration did not return a payment challenge")

    async def _register_retrying_payment(
        self, request: JsonDict, attempts: int, interval_ms: int
    ) -> Json:
        attempts = max(1, attempts)
        for attempt in range(attempts):
            try:
                return await self.register(request)
            except TinyPlaceError as exc:
                if attempt == attempts - 1 or not _should_retry_registration(exc):
                    raise
            if interval_ms > 0:
                await asyncio.sleep(interval_ms / 1000)
        raise RuntimeError("unreachable: registration retry loop exhausted")

    async def get(self, name: str) -> Json:
        return await self._http.get(f"/registry/names/{encode(name)}")

    async def export(self, name: str) -> Json:
        return await self._http.get(f"/registry/names/{encode(name)}/export")

    async def update_profile_visibility(self, name: str, update: JsonDict) -> Json:
        if self._signer and not update.get("signature"):
            update = {
                **update,
                "signature": await sign_fresh_canonical_payload(
                    self._signer,
                    canonical_payload(
                        "identity.profile.visibility",
                        {
                            "activity": update.get("activity"),
                            "agentCard": update.get("agentCard"),
                            "attestations": update.get("attestations"),
                            "broadcasts": update.get("broadcasts"),
                            "groups": update.get("groups"),
                            "searchEngineIndexing": update.get("searchEngineIndexing"),
                            "username": name,
                        },
                    ),
                ),
            }
        return await self._http.put_directory_auth(
            f"/registry/names/{encode(name)}/profile-visibility",
            update,
        )

    async def renew(self, name: str, request: JsonDict) -> Json:
        if self._signer and not request.get("signature"):
            request = {
                **request,
                "signature": await sign_fresh_canonical_payload(
                    self._signer,
                    canonical_payload("identity.renew", {"username": name}),
                ),
            }
        return await self._http.post_directory_auth(
            f"/registry/names/{encode(name)}/renew",
            request,
        )

    async def transfer(self, name: str, request: JsonDict) -> Json:
        if self._signer and not request.get("signature"):
            request = {
                **request,
                "signature": await sign_fresh_canonical_payload(
                    self._signer,
                    canonical_payload(
                        "identity.transfer",
                        {
                            "cryptoId": request.get("cryptoId"),
                            "publicKey": request.get("publicKey"),
                            "username": name,
                        },
                    ),
                ),
            }
        return await self._http.post_directory_auth(
            f"/registry/names/{encode(name)}/transfer",
            request,
        )

    async def assign_primary(self, name: str) -> Json:
        return await self._set_primary(name, True)

    async def unassign_primary(self, name: str) -> Json:
        return await self._set_primary(name, False)

    async def claim(self, name: str, request: JsonDict) -> Json:
        if self._signer and not request.get("signature"):
            request = {
                **request,
                "signature": await sign_fresh_canonical_payload(
                    self._signer,
                    canonical_payload(
                        "identity.claim",
                        {
                            "cryptoId": request.get("cryptoId"),
                            "publicKey": request.get("publicKey"),
                            "username": name,
                        },
                    ),
                ),
            }
        return await self._http.post(f"/registry/names/{encode(name)}/claim", request)

    async def create_subname(self, name: str, request: JsonDict) -> Json:
        if self._signer and not request.get("signature"):
            request = {
                **request,
                "signature": await sign_fresh_canonical_payload(
                    self._signer,
                    canonical_payload(
                        "identity.subname.create",
                        {
                            "bio": request.get("bio"),
                            "subname": request.get("subname"),
                            "target": request.get("target"),
                            "username": name,
                        },
                    ),
                ),
            }
        return await self._http.post_directory_auth(
            f"/registry/names/{encode(name)}/subnames",
            request,
        )

    async def delete_subname(self, name: str, subname: str) -> Json:
        headers = {}
        if self._signer:
            headers["X-TinyPlace-Signature"] = await sign_fresh_canonical_payload(
                self._signer,
                canonical_payload("identity.subname.delete", {"subname": subname, "username": name}),
            )
            presented_key = self._http.signing_public_key()
            if presented_key:
                headers["X-TinyPlace-Public-Key"] = presented_key
        return await self._http.delete_public(
            f"/registry/names/{encode(name)}/subnames/{encode(subname)}",
            headers=headers,
        )

    async def _set_primary(self, name: str, primary: bool) -> Json:
        action = "identity.assign" if primary else "identity.unassign"
        body: dict[str, Any] = {}
        if self._signer:
            body["signature"] = await sign_fresh_canonical_payload(
                self._signer,
                canonical_payload(action, {"username": name}),
            )
        suffix = "assign" if primary else "unassign"
        return await self._http.post_directory_auth(f"/registry/names/{encode(name)}/{suffix}", body)


def _normalize_handle(username: str) -> str:
    return username if username.startswith("@") else f"@{username}"


def _should_retry_registration(exc: TinyPlaceError) -> bool:
    """True when a registration failed only because the payment isn't confirmed yet."""
    haystack = f"{exc} {exc.body}".lower()
    return any(error in haystack for error in DEFAULT_REGISTRATION_RETRY_ERRORS)


def _registration_signature_payload(request: JsonDict) -> str:
    # Must byte-match the backend's registrationPayload
    # (backend-tinyplace/internal/identity/auth.go): exactly these four fields,
    # no actorType/primary. Both sides serialize canonically (sorted keys, null
    # for absent values), so any extra signed field breaks verification (401).
    return canonical_payload(
        "identity.register",
        {
            "cryptoId": request.get("cryptoId"),
            "paymentMethods": request.get("paymentMethods"),
            "publicKey": request.get("publicKey"),
            "username": request.get("username"),
        },
    )
