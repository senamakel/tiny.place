from __future__ import annotations

import asyncio
import base64
from typing import Any, Awaitable, Callable

import aiohttp
from solders.hash import Hash
from solders.instruction import AccountMeta, Instruction
from solders.keypair import Keypair
from solders.message import Message
from solders.pubkey import Pubkey
from solders.system_program import TransferParams, transfer
from solders.transaction import Transaction

from .crypto import decode_base58
from .signer import Signer
from .x402 import build_x402_payment_map

SOLANA_MAINNET_NETWORK = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
SOLANA_NATIVE_ASSET = "SOL"
# Mainnet USDC SPL mint (6 decimals). Devnet / custom deployments pass an
# explicit mint instead.
SOLANA_USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
SOLANA_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
USDC_DECIMALS = 6

RpcRequest = Callable[[str, list[Any]], Awaitable[Any]]


async def execute_solana_payment(
    *,
    rpc_url: str,
    secret_key: str | bytes,
    payment: dict[str, Any],
    network: str | None = None,
    native_asset: str = SOLANA_NATIVE_ASSET,
    mint: str | None = None,
    decimals: int = USDC_DECIMALS,
    source_token_account: str | None = None,
    destination_token_account: str | None = None,
    commitment: str = "confirmed",
    confirmation_polls: int = 20,
    rpc_request: RpcRequest | None = None,
) -> dict[str, str]:
    if network is not None and payment["network"] != network:
        raise ValueError(f"Unexpected Solana network: {payment['network']} (expected {network})")
    if network is None and not str(payment["network"]).startswith("solana:"):
        raise ValueError(f"Unsupported Solana network: {payment['network']}")

    asset = str(payment["asset"])
    is_native = asset.upper() == native_asset.upper()
    if not is_native and asset.upper() != "USDC" and mint is None:
        raise ValueError(
            f'Unsupported Solana asset: {asset} '
            f'(provide a mint, or use the native "{native_asset}" asset)'
        )

    keypair = _keypair_from_secret(secret_key)
    payer = str(keypair.pubkey())
    amount = str(payment["amount"])
    to = str(payment["to"])
    request = rpc_request or _aiohttp_rpc_request(rpc_url)

    # Native SOL: a System-program lamport transfer, payer -> recipient wallet.
    if is_native:
        latest = await request("getLatestBlockhash", [{"commitment": commitment}])
        tx = _native_transfer_transaction(
            keypair=keypair,
            to=to,
            amount=int(amount),
            blockhash=latest["value"]["blockhash"],
        )
        signature = await _send_transaction(request, tx, commitment)
        await _confirm_signature(request, signature, commitment, confirmation_polls)
        return {
            "signature": signature,
            "from": payer,
            "to": to,
            "mint": native_asset,
            "amount": amount,
            "sourceTokenAccount": payer,
            "destinationTokenAccount": to,
        }

    # SPL token (e.g. USDC) via TransferChecked. Token-account lookups happen
    # before the blockhash fetch to match the TS SDK's RPC ordering.
    resolved_mint = mint or SOLANA_USDC_MINT
    source = source_token_account or await _find_token_account(
        request, owner=payer, mint=resolved_mint, minimum_amount=amount
    )
    destination = destination_token_account or await _find_token_account(
        request, owner=to, mint=resolved_mint
    )
    latest = await request("getLatestBlockhash", [{"commitment": commitment}])
    tx = _token_transfer_checked_transaction(
        keypair=keypair,
        source=source,
        destination=destination,
        mint=resolved_mint,
        amount=int(amount),
        decimals=decimals,
        blockhash=latest["value"]["blockhash"],
    )
    signature = await _send_transaction(request, tx, commitment)
    await _confirm_signature(request, signature, commitment, confirmation_polls)
    return {
        "signature": signature,
        "from": payer,
        "to": to,
        "mint": resolved_mint,
        "amount": amount,
        "sourceTokenAccount": source,
        "destinationTokenAccount": destination,
    }


async def execute_solana_x402_payment(
    *,
    signer: Signer,
    rpc_url: str,
    secret_key: str | bytes,
    payment: dict[str, Any],
    mint: str | None = None,
    decimals: int = USDC_DECIMALS,
    source_token_account: str | None = None,
    destination_token_account: str | None = None,
    commitment: str = "confirmed",
    confirmation_polls: int = 20,
    rpc_request: RpcRequest | None = None,
) -> dict[str, Any]:
    execution = await execute_solana_payment(
        rpc_url=rpc_url,
        secret_key=secret_key,
        payment=payment,
        mint=mint,
        decimals=decimals,
        source_token_account=source_token_account,
        destination_token_account=destination_token_account,
        commitment=commitment,
        confirmation_polls=confirmation_polls,
        rpc_request=rpc_request,
    )
    payment_map = await build_x402_payment_map(
        signer,
        {
            **payment,
            "onChainTx": execution["signature"],
            "tx": execution["signature"],
            "transaction": execution["signature"],
        },
    )
    return {**execution, "payment": payment_map}


async def _send_transaction(rpc_request: RpcRequest, tx: Transaction, commitment: str) -> str:
    signature = await rpc_request(
        "sendTransaction",
        [
            base64.b64encode(bytes(tx)).decode("ascii"),
            {
                "encoding": "base64",
                "preflightCommitment": "processed" if commitment == "processed" else "confirmed",
            },
        ],
    )
    return str(signature)


def _native_transfer_transaction(
    *,
    keypair: Keypair,
    to: str,
    amount: int,
    blockhash: str,
) -> Transaction:
    instruction = transfer(
        TransferParams(
            from_pubkey=keypair.pubkey(),
            to_pubkey=Pubkey.from_string(to),
            lamports=amount,
        )
    )
    recent_blockhash = Hash.from_string(blockhash)
    message = Message.new_with_blockhash([instruction], keypair.pubkey(), recent_blockhash)
    return Transaction([keypair], message, recent_blockhash)


def _token_transfer_checked_transaction(
    *,
    keypair: Keypair,
    source: str,
    destination: str,
    mint: str,
    amount: int,
    decimals: int,
    blockhash: str,
) -> Transaction:
    # SPL Token TransferChecked: u8 discriminant (12) + u64 LE amount + u8 decimals.
    # Accounts (in program order): source, mint, destination, owner/authority.
    data = bytes([12]) + int(amount).to_bytes(8, "little") + bytes([decimals & 0xFF])
    accounts = [
        AccountMeta(pubkey=Pubkey.from_string(source), is_signer=False, is_writable=True),
        AccountMeta(pubkey=Pubkey.from_string(mint), is_signer=False, is_writable=False),
        AccountMeta(pubkey=Pubkey.from_string(destination), is_signer=False, is_writable=True),
        AccountMeta(pubkey=keypair.pubkey(), is_signer=True, is_writable=False),
    ]
    instruction = Instruction(Pubkey.from_string(SOLANA_TOKEN_PROGRAM_ID), data, accounts)
    recent_blockhash = Hash.from_string(blockhash)
    message = Message.new_with_blockhash([instruction], keypair.pubkey(), recent_blockhash)
    return Transaction([keypair], message, recent_blockhash)


async def _find_token_account(
    rpc_request: RpcRequest,
    *,
    owner: str,
    mint: str,
    minimum_amount: str | None = None,
) -> str:
    """Resolve ``owner``'s token account for ``mint`` (the one holding enough funds)."""
    response = await rpc_request(
        "getTokenAccountsByOwner",
        [owner, {"mint": mint}, {"encoding": "jsonParsed", "commitment": "confirmed"}],
    )
    minimum = int(minimum_amount) if minimum_amount is not None else None
    for account in (response.get("value") or []) if isinstance(response, dict) else []:
        info = (((account.get("account") or {}).get("data") or {}).get("parsed") or {}).get("info") or {}
        amount_value = (info.get("tokenAmount") or {}).get("amount") or "0"
        if minimum is None or int(amount_value) >= minimum:
            return str(account["pubkey"])
    raise RuntimeError(f"No token account found for {owner} (mint {mint})")


async def _confirm_signature(
    rpc_request: RpcRequest,
    signature: str,
    commitment: str,
    polls: int,
) -> None:
    for _ in range(polls):
        result = await rpc_request(
            "getSignatureStatuses",
            [[signature], {"searchTransactionHistory": True}],
        )
        status = (result.get("value") or [None])[0]
        if status and status.get("err") is not None:
            raise RuntimeError(f"Solana transaction failed: {status['err']}")
        if status and _commitment_satisfied(str(status.get("confirmationStatus") or ""), commitment):
            return
        await asyncio.sleep(0.5)
    raise TimeoutError(f"Timed out waiting for Solana transaction {signature}")


def _commitment_satisfied(actual: str, expected: str) -> bool:
    ranks = {"processed": 0, "confirmed": 1, "finalized": 2}
    return ranks.get(actual, -1) >= ranks.get(expected, 1)


def _keypair_from_secret(secret_key: str | bytes) -> Keypair:
    secret = decode_base58(secret_key) if isinstance(secret_key, str) else secret_key
    if len(secret) == 32:
        return Keypair.from_seed(secret)
    if len(secret) == 64:
        return Keypair.from_bytes(secret)
    raise ValueError(f"Solana secret key must be 32 or 64 bytes, got {len(secret)}")


def _aiohttp_rpc_request(rpc_url: str) -> RpcRequest:
    async def request(method: str, params: list[Any]) -> Any:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                rpc_url,
                json={"jsonrpc": "2.0", "id": method, "method": method, "params": params},
            ) as response:
                payload = await response.json()
        if "error" in payload:
            raise RuntimeError(payload["error"].get("message", payload["error"]))
        return payload.get("result")

    return request
