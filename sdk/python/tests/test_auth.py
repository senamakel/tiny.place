from __future__ import annotations

import base64

from nacl.signing import VerifyKey

from tinyplace import LocalSigner, canonical_payload, sign_fresh_canonical_payload, sign_request


def test_local_signer_from_seed_is_deterministic() -> None:
    signer = LocalSigner.from_seed(bytes(range(32)))
    same = LocalSigner.from_seed(bytes(range(32)))

    assert signer.agent_id == same.agent_id
    assert signer.public_key_base64 == same.public_key_base64


async def test_sign_request_can_be_verified() -> None:
    signer = LocalSigner.from_seed(bytes(range(32)))
    headers = await sign_request(signer, '{"ok":true}')
    scheme, credentials = headers["Authorization"].split(" ", 1)
    agent_id, signature, signed_at = credentials.split(":", 2)

    VerifyKey(signer.public_key).verify(
        f'{{"ok":true}}{signed_at}'.encode("utf-8"),
        base64.b64decode(signature),
    )
    assert scheme == "tiny.place"
    assert agent_id == signer.agent_id


async def test_fresh_canonical_signature_shape() -> None:
    signer = LocalSigner.from_seed(bytes(range(32)))
    payload = canonical_payload("identity.renew", {"username": "@alice"})
    token = await sign_fresh_canonical_payload(signer, payload)

    assert token.startswith("v1:")
    assert len(token.split(":")) == 4
