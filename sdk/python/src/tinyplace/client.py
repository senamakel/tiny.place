from __future__ import annotations

from typing import Any

import aiohttp

from .api import DirectoryApi, DocsApi, KeysApi, MessagesApi, PaymentsApi, RegistryApi, SearchApi
from .auth import AdminSigningOptions
from .http import AuthInvalidHook, HttpClient, TinyPlaceError
from .signer import Signer
from .types import Json, JsonDict


class TinyPlaceClient:
    def __init__(
        self,
        *,
        base_url: str,
        signer: Signer | None = None,
        admin_signer: Signer | None = None,
        admin: AdminSigningOptions | None = None,
        session: aiohttp.ClientSession | None = None,
        on_auth_invalid: AuthInvalidHook | None = None,
    ) -> None:
        self._signer = signer
        self.http = HttpClient(
            base_url=base_url,
            signer=signer,
            admin_signer=admin_signer,
            admin=admin,
            session=session,
            on_auth_invalid=on_auth_invalid,
        )
        self.registry = RegistryApi(self.http, signer)
        self.keys = KeysApi(self.http)
        self.messages = MessagesApi(self.http)
        self.directory = DirectoryApi(self.http)
        self.payments = PaymentsApi(self.http, signer)
        self.search = SearchApi(self.http)
        self.docs = DocsApi(self.http)

    async def __aenter__(self) -> "TinyPlaceClient":
        return self

    async def __aexit__(self, *_exc: object) -> None:
        await self.close()

    async def close(self) -> None:
        await self.http.close()

    async def healthz(self) -> Json:
        return await self.http.get("/healthz")

    async def spec(self) -> Json:
        return await self.http.get("/spec")

    # -- Convenience helpers ------------------------------------------------
    # Flat, task-oriented wrappers over the namespaced APIs. They mirror the
    # method surface the Hermes plugin (issue #29) drives: domains map to
    # @handle registry names, identity to the open directory.

    async def search_domain(self, query: str) -> JsonDict:
        """Check whether a ``@handle`` domain is available to register.

        Returns ``{"name", "available", "record"}`` — ``record`` is the existing
        registration when the name is taken, otherwise ``None``.
        """
        name = _normalize_handle(query)
        try:
            record = await self.registry.get(name)
        except TinyPlaceError as error:
            if error.status == 404:
                return {"name": name, "available": True, "record": None}
            raise
        return {"name": name, "available": False, "record": record}

    async def register_domain(self, domain: str, **fields: Any) -> Json:
        """Register a ``@handle`` domain for the signing agent.

        ``cryptoId`` and ``publicKey`` default to the configured signer's
        identity; the registration signature is added by :class:`RegistryApi`.
        Extra registration fields (``actorType``, ``paymentMethods``, ...) may
        be passed as keyword arguments.
        """
        request: JsonDict = {"username": domain, **fields}
        if self._signer is not None:
            request.setdefault("cryptoId", self._signer.agent_id)
            request.setdefault("publicKey", self._signer.public_key_base64)
        return await self.registry.register(request)

    async def get_identity(self) -> Json:
        """Resolve the signing agent's own directory identity (reverse lookup)."""
        if self._signer is None:
            raise ValueError("get_identity requires a signer")
        return await self.directory.reverse(self._signer.agent_id)

    async def resolve_user(self, handle: str) -> Json:
        """Resolve a ``@handle`` to its directory identity + agent card."""
        return await self.directory.resolve(_normalize_handle(handle))


def _normalize_handle(value: str) -> str:
    return value if value.startswith("@") else f"@{value}"
