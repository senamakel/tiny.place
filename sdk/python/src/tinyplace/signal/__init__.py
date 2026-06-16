"""Signal Protocol implementation for the tiny.place Python SDK.

This package is a byte-compatible port of the flagship TypeScript SDK's
``src/signal`` modules. This slice ships only the crypto primitives
(:mod:`tinyplace.signal.crypto`); X3DH, the Double Ratchet, key management,
the session store, and sender keys land in later slices.
"""

from __future__ import annotations

from .crypto import (
    X25519KeyPair,
    aes_decrypt,
    aes_encrypt,
    compute_hmac,
    decrypt,
    derive_message_keys,
    ed25519_keypair_from_seed,
    ed25519_pub_to_x25519_pub,
    ed25519_seed_to_x25519_keypair,
    ed25519_seed_to_x25519_private,
    ed25519_sign,
    ed25519_verify,
    encrypt,
    from_base64,
    generate_x25519_keypair,
    hkdf,
    kdf_chain_key,
    kdf_root_key,
    to_base64,
    x25519_shared_secret,
)

__all__ = [
    "X25519KeyPair",
    "generate_x25519_keypair",
    "x25519_shared_secret",
    "ed25519_seed_to_x25519_private",
    "ed25519_seed_to_x25519_keypair",
    "ed25519_pub_to_x25519_pub",
    "ed25519_keypair_from_seed",
    "ed25519_sign",
    "ed25519_verify",
    "hkdf",
    "kdf_root_key",
    "kdf_chain_key",
    "derive_message_keys",
    "aes_encrypt",
    "aes_decrypt",
    "compute_hmac",
    "encrypt",
    "decrypt",
    "to_base64",
    "from_base64",
]
