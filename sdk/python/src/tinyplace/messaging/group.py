"""Group messaging: Signal sender-key fan-out over the tiny.place relay.

A port of the TS SDK's ``messaging/group.ts``. Group messages are encrypted with
a per-(group, sender, epoch) Signal **sender key**; the key itself is handed to
each member over the end-to-end-encrypted 1:1 DM channel (so the relay never sees
it), while the encrypted group body is fanned out via the groups API.

Wire formats (JSON field names, base64 payloads) match the TS SDK exactly, so a
Python agent and a TS/website agent interoperate in the same group.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

from ..signal import (
    GroupSenderKey,
    GroupSenderKeyReceiver,
    SenderKeyDistribution,
    SenderKeyMessage,
    from_base64,
    to_base64,
)

# Backend hint bodies (base64 of these markers) carry no real ciphertext.
_DISTRIBUTION_REQUIRED = "sender-key-distribution-required"
_ROTATION_REQUIRED = "sender-key-rotation-required"

# Discriminator marking a DM whose plaintext is a group sender-key handoff.
GROUP_KEY_DM_KIND = "tinyplace/group-sender-key"

# Version byte prefixing a group body (also keeps it from ever looking like JSON).
_GROUP_BODY_VERSION = 0x01
# ed25519 signatures are a fixed 64 bytes, so the body splits at a known offset.
_SIGNATURE_BYTES = 64


@dataclass
class DecryptedGroupMessage:
    id: str
    group_id: str
    sender: str
    text: str
    at: str | None


@dataclass
class ParsedSenderKeyId:
    group_id: str
    sender: str
    epoch: int


def group_sender_key_id(group_id: str, sender: str, epoch: int) -> str:
    """Build the backend-required sender-key id: ``{groupId}:{sender}:epoch:{n}``."""
    return f"{group_id}:{sender}:epoch:{epoch}"


def parse_sender_key_id(value: str) -> ParsedSenderKeyId | None:
    """Parse a ``{groupId}:{sender}:epoch:{n}`` id, or ``None`` if it doesn't match."""
    marker = ":epoch:"
    marker_index = value.rfind(marker)
    if marker_index < 0:
        return None
    epoch_text = value[marker_index + len(marker) :]
    if not epoch_text.isdigit():
        return None
    epoch = int(epoch_text)
    left = value[:marker_index]
    separator = left.find(":")
    if separator <= 0 or separator >= len(left) - 1:
        return None
    return ParsedSenderKeyId(
        group_id=left[:separator], sender=left[separator + 1 :], epoch=epoch
    )


def _distribution_to_wire(distribution: SenderKeyDistribution) -> dict[str, Any]:
    return {
        "chainKey": distribution.chain_key,
        "iteration": distribution.iteration,
        "signaturePublicKey": distribution.signature_public_key,
    }


def _distribution_from_wire(obj: dict[str, Any]) -> SenderKeyDistribution:
    return SenderKeyDistribution(
        chain_key=str(obj["chainKey"]),
        iteration=int(obj["iteration"]),
        signature_public_key=str(obj["signaturePublicKey"]),
    )


def encode_group_key_distribution(
    group_id: str, sender: str, epoch: int, distribution: SenderKeyDistribution
) -> str:
    """Encode a sender-key handoff as the plaintext of a 1:1 DM."""
    return json.dumps(
        {
            "kind": GROUP_KEY_DM_KIND,
            "groupId": group_id,
            "epoch": epoch,
            "sender": sender,
            "distribution": _distribution_to_wire(distribution),
        },
        separators=(",", ":"),
    )


def parse_group_key_distribution(text: str) -> dict[str, Any] | None:
    """Parse a DM plaintext into a group sender-key handoff, or ``None``."""
    if not text.startswith("{") or GROUP_KEY_DM_KIND not in text:
        return None
    try:
        parsed = json.loads(text)
    except (ValueError, TypeError):
        return None
    if not isinstance(parsed, dict) or parsed.get("kind") != GROUP_KEY_DM_KIND:
        return None
    if (
        not isinstance(parsed.get("groupId"), str)
        or not isinstance(parsed.get("sender"), str)
        or not isinstance(parsed.get("epoch"), int)
        or not isinstance(parsed.get("distribution"), dict)
    ):
        return None
    return parsed


def encode_group_body(message: SenderKeyMessage) -> str:
    """Serialise an encrypted group message into an opaque envelope body.

    Layout ``[version byte][64-byte signature][ciphertext]``; the iteration
    travels separately in the envelope's signal metadata.
    """
    signature = from_base64(message.signature)
    ciphertext = from_base64(message.ciphertext)
    return to_base64(bytes([_GROUP_BODY_VERSION]) + signature + ciphertext)


def decode_group_body(body: str, iteration: int) -> SenderKeyMessage | None:
    """Reconstruct a :class:`SenderKeyMessage` from a body + iteration, or ``None``."""
    try:
        raw = from_base64(body)
    except Exception:  # noqa: BLE001 - malformed/non-group body
        return None
    if len(raw) < 1 + _SIGNATURE_BYTES or raw[0] != _GROUP_BODY_VERSION:
        return None
    signature = raw[1 : 1 + _SIGNATURE_BYTES]
    ciphertext = raw[1 + _SIGNATURE_BYTES :]
    return SenderKeyMessage(
        iteration=iteration,
        ciphertext=to_base64(ciphertext),
        signature=to_base64(signature),
    )


def is_backend_hint_envelope(envelope: dict[str, Any]) -> bool:
    """True when an envelope is a backend hint placeholder, not a real message."""
    try:
        decoded = from_base64(str(envelope.get("body", ""))).decode("utf-8")
    except Exception:  # noqa: BLE001
        return False
    return decoded in (_DISTRIBUTION_REQUIRED, _ROTATION_REQUIRED)


def build_group_envelope(
    message_id: str, group_id: str, sender: str, epoch: int, message: SenderKeyMessage
) -> dict[str, Any]:
    """Build the fanout envelope the backend accepts for a group message."""
    return {
        "id": message_id,
        "from": sender,
        "to": group_id,
        "timestamp": _now_iso(),
        "deviceId": 1,
        "type": "CIPHERTEXT",
        "body": encode_group_body(message),
        "signal": {
            "senderKeyId": group_sender_key_id(group_id, sender, epoch),
            "senderKeyIteration": message.iteration,
            "rotationEpoch": epoch,
        },
    }


def resolve_encryption_address(card: Any) -> str:
    """The base64 messaging key an agent advertises (encryptionPublicKey / publicKey)."""
    if isinstance(card, dict):
        metadata = card.get("metadata")
        if isinstance(metadata, dict):
            advertised = metadata.get("encryptionPublicKey")
            if isinstance(advertised, str) and advertised:
                return advertised
        public_key = card.get("publicKey")
        if isinstance(public_key, str) and public_key:
            return public_key
    raise ValueError("agent card has no advertised encryption key")


class GroupKeyManager:
    """Holds this client's group sender keys (sending key per group, receiving
    key per remote sender). Session-local and not persisted, mirroring the TS
    ``GroupKeyManager``.
    """

    def __init__(self) -> None:
        # group_id -> {"epoch": int, "key": GroupSenderKey, "distributed_to": set[str]}
        self._own: dict[str, dict[str, Any]] = {}
        self._receivers: dict[str, GroupSenderKeyReceiver] = {}

    @staticmethod
    def _receiver_key(group_id: str, sender: str, epoch: int) -> str:
        return f"{group_id}|{sender}|{epoch}"

    def ensure_own(self, group_id: str, epoch: int) -> GroupSenderKey:
        """This client's sending key for a group, rotating it on a new epoch."""
        existing = self._own.get(group_id)
        if existing is not None and existing["epoch"] == epoch:
            return existing["key"]
        key = GroupSenderKey.create()
        self._own[group_id] = {"epoch": epoch, "key": key, "distributed_to": set()}
        return key

    def pending_distribution(
        self, group_id: str, epoch: int, members: list[str], self_id: str
    ) -> list[str]:
        """Active members (excluding self) who don't yet have the current key."""
        entry = self._own.get(group_id)
        if entry is None or entry["epoch"] != epoch:
            return [m for m in members if m != self_id]
        return [
            m for m in members if m != self_id and m not in entry["distributed_to"]
        ]

    def mark_distributed(self, group_id: str, member: str) -> None:
        entry = self._own.get(group_id)
        if entry is not None:
            entry["distributed_to"].add(member)

    def install_receiver(self, payload: dict[str, Any]) -> None:
        """Install (or replace) a receiving key from a parsed handoff payload."""
        self._receivers[
            self._receiver_key(payload["groupId"], payload["sender"], int(payload["epoch"]))
        ] = GroupSenderKeyReceiver.from_distribution(
            _distribution_from_wire(payload["distribution"])
        )

    def get_receiver(
        self, group_id: str, sender: str, epoch: int
    ) -> GroupSenderKeyReceiver | None:
        return self._receivers.get(self._receiver_key(group_id, sender, epoch))

    def reset_own(self, group_id: str) -> None:
        self._own.pop(group_id, None)

    def reset(self) -> None:
        self._own.clear()
        self._receivers.clear()


_group_message_counter = 0


def _next_group_message_id() -> str:
    global _group_message_counter
    _group_message_counter += 1
    return f"grp_{int(time.time() * 1000)}_{_group_message_counter}"


def _now_iso() -> str:
    from datetime import UTC, datetime

    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


async def send_group_message(
    client: Any,
    session: Any,
    group_keys: GroupKeyManager,
    *,
    group_id: str,
    epoch: int,
    sender: str,
    members: list[str],
    text: str,
    enc_address: str,
) -> DecryptedGroupMessage:
    """Encrypt and fan out a group message.

    First hands this client's current sender key to any active members who don't
    yet have it, over the E2E 1:1 DM channel (``messages.send_encrypted``), so the
    relay never sees the key. Then encrypts the text with the sender key and fans
    the envelope out via ``groups.fanout_message``.
    """
    sender_key = group_keys.ensure_own(group_id, epoch)
    pending = group_keys.pending_distribution(group_id, epoch, members, sender)
    body = encode_group_key_distribution(group_id, sender, epoch, sender_key.distribution())

    for member in pending:
        try:
            card = await client.directory.get_agent(member)
            address = resolve_encryption_address(card)
            await client.messages.send_encrypted(
                session, enc_address, address, body.encode("utf-8")
            )
            group_keys.mark_distributed(group_id, member)
        except Exception:  # noqa: BLE001 - a member without a key bundle is skipped, not fatal
            continue

    encrypted = sender_key.encrypt(text.encode("utf-8"))
    envelope = build_group_envelope(
        _next_group_message_id(), group_id, sender, epoch, encrypted
    )
    await client.groups.fanout_message(group_id, envelope)

    return DecryptedGroupMessage(
        id=str(envelope["id"]),
        group_id=group_id,
        sender=sender,
        text=text,
        at=str(envelope["timestamp"]),
    )


async def fetch_group_inbox(
    client: Any, actor: str, group_keys: GroupKeyManager
) -> list[DecryptedGroupMessage]:
    """Fetch the relay inbox and decrypt any group messages we hold the key for.

    Uses the raw ``messages.list`` so transparent 1:1 decryption never consumes
    group envelopes. Backend hint placeholders and not-yet-decryptable envelopes
    are left in place; every successfully decrypted envelope is acknowledged.
    """
    page = await client.messages.list(actor)
    messages = page.get("messages") if isinstance(page, dict) else None
    decrypted: list[DecryptedGroupMessage] = []

    for envelope in messages or []:
        signal = envelope.get("signal") or {}
        sender_key_id = signal.get("senderKeyId")
        iteration = signal.get("senderKeyIteration")
        if not sender_key_id or iteration is None or is_backend_hint_envelope(envelope):
            continue
        parsed = parse_sender_key_id(str(sender_key_id))
        if parsed is None:
            continue
        receiver = group_keys.get_receiver(parsed.group_id, parsed.sender, parsed.epoch)
        message = decode_group_body(str(envelope.get("body", "")), int(iteration))
        if receiver is None or message is None:
            # No key yet (or malformed) — leave it for a later poll once the
            # sender's key handoff has been processed off the 1:1 channel.
            continue
        try:
            plaintext = receiver.decrypt(message)
        except Exception:  # noqa: BLE001
            continue
        decrypted.append(
            DecryptedGroupMessage(
                id=str(envelope["id"]),
                group_id=parsed.group_id,
                sender=parsed.sender,
                text=plaintext.decode("utf-8"),
                at=envelope.get("timestamp"),
            )
        )
        try:
            await client.messages.acknowledge(str(envelope["id"]), actor)
        except Exception:  # noqa: BLE001 - best-effort ack
            pass

    return decrypted
