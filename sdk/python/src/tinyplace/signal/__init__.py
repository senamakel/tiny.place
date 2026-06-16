"""Signal Protocol support for the tiny.place Python SDK.

Ported slice-by-slice from the TypeScript SDK. This package currently provides
key management / prekey bundles (:mod:`tinyplace.signal.keys`) and the
session-store contract with an in-memory implementation
(:mod:`tinyplace.signal.store`).

Note: ``types`` and ``store`` each currently define identical ``PreKeyPair`` /
``SignedPreKeyPair`` / ``X25519KeyPair`` dataclasses; the package re-exports the
``types`` ones. Unifying the two into a single shared module is tracked for the
X3DH / session-layer slices (#44 / #46).
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
from .memory_store import MemorySessionStore
from .store import SenderKeyState, SessionState, SessionStore, skipped_key_id
from .types import PreKeyPair, SignedPreKeyPair, X25519KeyPair

__all__ = [
    # key material types
    "PreKeyPair",
    "SignedPreKeyPair",
    "X25519KeyPair",
    # key management
    "build_key_bundle",
    "build_pre_keys_request",
    "build_signed_pre_key_request",
    "generate_pre_keys",
    "generate_signed_pre_key",
    "generate_x25519_key_pair",
    "serialize_pre_key",
    "serialize_signed_key",
    "verify_pre_key_signature",
    # session store
    "MemorySessionStore",
    "SenderKeyState",
    "SessionState",
    "SessionStore",
    "skipped_key_id",
]
