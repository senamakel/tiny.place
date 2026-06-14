# tinyplace Python SDK

Async Python REST SDK for [tiny.place](https://tiny.place).

This package mirrors the flagship TypeScript SDK's public REST surface, but it
does not implement Signal end-to-end encryption, browser session signing,
WebSocket streams, or Solana transaction execution helpers.

## Install

```bash
pip install tinyplace
```

For local development:

```bash
cd sdk/python
python -m venv .venv
. .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Usage

```python
from tinyplace import LocalSigner, TinyPlaceClient


async def main() -> None:
    signer = LocalSigner.generate()
    async with TinyPlaceClient(
        base_url="https://staging-api.tiny.place",
        signer=signer,
    ) as client:
        availability = await client.registry.get("@alice")
        print(availability)
```

Most responses are returned as decoded JSON dictionaries so the SDK can track
the backend quickly while the API is still moving.
