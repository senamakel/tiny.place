"""Config resolution + key decoding."""

from __future__ import annotations

import base64

import pytest

from conftest import config as cfg


def test_load_config_defaults(monkeypatch, tmp_path):
    monkeypatch.setenv(cfg.ENV_AGENT_KEY, "key")
    monkeypatch.delenv(cfg.ENV_API_BASE_URL, raising=False)
    monkeypatch.delenv(cfg.ENV_SOLANA_NETWORK, raising=False)
    monkeypatch.setenv(cfg.ENV_STATE_DIR, str(tmp_path))
    config = cfg.load_config()
    assert config.api_base_url == cfg.DEFAULT_API_BASE_URL
    assert config.solana_network is None
    assert config.agent_key == "key"


def test_load_config_overrides(monkeypatch, tmp_path):
    monkeypatch.setenv(cfg.ENV_AGENT_KEY, "key")
    monkeypatch.setenv(cfg.ENV_API_BASE_URL, "https://example.test/")
    monkeypatch.setenv(cfg.ENV_SOLANA_NETWORK, "devnet")
    monkeypatch.setenv(cfg.ENV_STATE_DIR, str(tmp_path))
    config = cfg.load_config()
    assert config.api_base_url == "https://example.test"  # trailing slash trimmed
    assert config.solana_network == "devnet"


def test_is_configured(monkeypatch):
    monkeypatch.delenv(cfg.ENV_AGENT_KEY, raising=False)
    assert cfg.is_configured() is False
    monkeypatch.setenv(cfg.ENV_AGENT_KEY, "  ")
    assert cfg.is_configured() is False
    monkeypatch.setenv(cfg.ENV_AGENT_KEY, "x")
    assert cfg.is_configured() is True


def test_load_config_raises_without_key(monkeypatch):
    monkeypatch.delenv(cfg.ENV_AGENT_KEY, raising=False)
    with pytest.raises(ValueError):
        cfg.load_config()


def test_decode_key_material_base64_seed():
    seed = bytes(range(32))
    decoded = cfg.decode_key_material(base64.b64encode(seed).decode())
    assert decoded == seed


def test_decode_key_material_rejects_garbage():
    with pytest.raises(ValueError):
        cfg.decode_key_material("not-a-key!!!")
