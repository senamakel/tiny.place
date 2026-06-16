from __future__ import annotations

import pytest

from tinyplace.signal import (
    MemorySessionStore,
    PreKeyPair,
    SenderKeyState,
    SessionState,
    SignedPreKeyPair,
    X25519KeyPair,
    skipped_key_id,
)
from tinyplace.signal.store import SessionStore


def _key_pair(seed: int) -> X25519KeyPair:
    return X25519KeyPair(
        public_key=bytes([seed]) * 32,
        private_key=bytes([seed + 1]) * 32,
    )


def _session(seed: int) -> SessionState:
    return SessionState(
        dh_send_key_pair=_key_pair(seed),
        dh_recv_public_key=bytes([seed + 2]) * 32,
        root_key=bytes([seed + 3]) * 32,
        send_chain_key=bytes([seed + 4]) * 32,
        recv_chain_key=None,
        send_message_number=1,
        recv_message_number=2,
        previous_chain_length=3,
        skipped_keys={skipped_key_id(bytes([0xAB, 0xCD]), 7): b"messagekey"},
    )


def _store() -> MemorySessionStore:
    return MemorySessionStore(_key_pair(0))


def test_memory_store_is_a_session_store() -> None:
    assert isinstance(_store(), SessionStore)


def test_session_store_is_abstract() -> None:
    with pytest.raises(TypeError):
        SessionStore()  # type: ignore[abstract]


def test_skipped_key_id_matches_typescript_format() -> None:
    assert skipped_key_id(bytes([0x00, 0xFF]), 3) == "00ff:3"


async def test_identity_round_trips() -> None:
    identity = _key_pair(0)
    store = MemorySessionStore(identity)
    assert await store.get_identity_x25519_key_pair() is identity


async def test_signed_pre_key_round_trip_and_active() -> None:
    store = _store()
    assert await store.get_signed_pre_key("spk-1") is None

    with pytest.raises(LookupError):
        await store.get_active_signed_pre_key()

    first = SignedPreKeyPair(key_id="spk-1", key_pair=_key_pair(10), signature=b"s1")
    second = SignedPreKeyPair(key_id="spk-2", key_pair=_key_pair(20), signature=b"s2")
    await store.store_signed_pre_key(first)
    assert await store.get_signed_pre_key("spk-1") == first
    assert await store.get_active_signed_pre_key() == first

    # Storing a newer signed pre-key makes it the active one.
    await store.store_signed_pre_key(second)
    assert await store.get_active_signed_pre_key() == second
    assert await store.get_signed_pre_key("spk-1") == first


async def test_active_signed_pre_key_missing_record_raises() -> None:
    store = _store()
    store._active_signed_pre_key_id = "ghost"
    with pytest.raises(LookupError):
        await store.get_active_signed_pre_key()


async def test_pre_key_put_get_list_delete() -> None:
    store = _store()
    assert await store.get_pre_key("otp-1") is None
    assert await store.get_all_pre_keys() == []

    one = PreKeyPair(key_id="otp-1", key_pair=_key_pair(30), signature=b"o1")
    two = PreKeyPair(key_id="otp-2", key_pair=_key_pair(40), signature=b"o2")
    await store.store_pre_key(one)
    await store.store_pre_key(two)

    assert await store.get_pre_key("otp-1") == one
    listed = await store.get_all_pre_keys()
    assert {pk.key_id for pk in listed} == {"otp-1", "otp-2"}

    await store.remove_pre_key("otp-1")
    assert await store.get_pre_key("otp-1") is None
    assert {pk.key_id for pk in await store.get_all_pre_keys()} == {"otp-2"}

    # Deleting an absent pre-key is a no-op.
    await store.remove_pre_key("does-not-exist")


async def test_session_put_get_delete() -> None:
    store = _store()
    assert await store.get_session("@peer") is None

    session = _session(50)
    await store.store_session("@peer", session)
    fetched = await store.get_session("@peer")
    assert fetched == session
    assert fetched is not None
    assert fetched.skipped_keys[skipped_key_id(bytes([0xAB, 0xCD]), 7)] == b"messagekey"

    await store.remove_session("@peer")
    assert await store.get_session("@peer") is None

    # Deleting an absent session is a no-op.
    await store.remove_session("@missing")


async def test_sender_key_put_get_delete() -> None:
    store = _store()
    assert await store.get_sender_key("group-1") is None

    sender_key = SenderKeyState(
        distribution_id="group-1",
        chain_key=bytes([0x11]) * 32,
        message_number=5,
        signing_key_pair=_key_pair(60),
    )
    await store.store_sender_key(sender_key)
    assert await store.get_sender_key("group-1") == sender_key

    await store.remove_sender_key("group-1")
    assert await store.get_sender_key("group-1") is None

    # Deleting an absent sender key is a no-op.
    await store.remove_sender_key("group-missing")
