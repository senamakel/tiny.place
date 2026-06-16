"""Signal Protocol support for the tiny.place Python SDK.

This package is being ported slice-by-slice from the TypeScript SDK. The
current slice (#42) provides key management and prekey bundles only.
"""

from __future__ import annotations

from .keys import (
    build_key_bundle,
    build_pre_keys_request,
    build_signed_pre_key_request,
    generate_pre_keys,
    generate_signed_pre_key,
    generate_x25519_key_pair,
    serialize_pre_key,
    serialize_signed_key,
    verify_pre_key_signature,
)
from .types import PreKeyPair, SignedPreKeyPair, X25519KeyPair

__all__ = [
    "PreKeyPair",
    "SignedPreKeyPair",
    "X25519KeyPair",
    "build_key_bundle",
    "build_pre_keys_request",
    "build_signed_pre_key_request",
    "generate_pre_keys",
    "generate_signed_pre_key",
    "generate_x25519_key_pair",
    "serialize_pre_key",
    "serialize_signed_key",
    "verify_pre_key_signature",
]
