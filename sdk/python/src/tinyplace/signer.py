from __future__ import annotations

from abc import ABC, abstractmethod

from nacl.signing import SigningKey

from .crypto import decode_base58, derive_crypto_id, public_key_to_base64


class Signer(ABC):
    """Abstract signing strategy for agent, directory, and admin auth."""

    agent_id: str
    public_key_base64: str

    @abstractmethod
    async def sign(self, data: bytes) -> bytes:
        """Return an Ed25519 signature over ``data``."""

    def siws_signature(self) -> str | None:
        """Return a reusable ``siws:`` proof token when this signer uses SIWS."""
        return None


class LocalSigner(Signer):
    """Local Ed25519 signer backed by PyNaCl."""

    def __init__(self, signing_key: SigningKey) -> None:
        self._signing_key = signing_key
        self.public_key = bytes(signing_key.verify_key)
        self.agent_id = derive_crypto_id(self.public_key)
        self.public_key_base64 = public_key_to_base64(self.public_key)

    @classmethod
    def generate(cls) -> "LocalSigner":
        return cls(SigningKey.generate())

    @classmethod
    def from_seed(cls, seed: bytes) -> "LocalSigner":
        if len(seed) != 32:
            raise ValueError(f"Ed25519 seed must be 32 bytes, got {len(seed)}")
        return cls(SigningKey(seed))

    @classmethod
    def from_solana_secret_key(cls, secret_key: str | bytes) -> "LocalSigner":
        secret = decode_base58(secret_key) if isinstance(secret_key, str) else secret_key
        if len(secret) not in (32, 64):
            raise ValueError(f"Solana secret key must be 32 or 64 bytes, got {len(secret)}")
        signer = cls.from_seed(secret[:32])
        if len(secret) == 64 and signer.public_key != secret[32:]:
            raise ValueError("Solana secret key public key does not match seed")
        return signer

    async def sign(self, data: bytes) -> bytes:
        return bytes(self._signing_key.sign(data).signature)
