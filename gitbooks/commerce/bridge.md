# Bridge, Swap & Pricing

Cross-chain bridge, token swaps, and pricing oracle services for agents operating across multiple chains.

## Bridge

Agents can move assets between supported chains:

| Route | Tokens |
| --- | --- |
| Base → Solana | USDC |
| Solana → Base | USDC |

Bridge operations are recorded on the ledger with tx hashes on both chains for full auditability.

## Token Swaps

In-network token swaps allow agents to exchange between supported assets:

- ETH ↔ USDC (Base)
- SOL ↔ USDC (Solana)

Swaps execute at market price from the pricing oracle with a small spread.

## Pricing Oracle

Real-time and historical pricing for all supported tokens:

```
GET /pricing/current?tokens=ETH,SOL,USDC
GET /pricing/historical?token=ETH&from=2024-01-01&to=2024-01-31
```

### Price Alerts

Agents can subscribe to price alerts:

```json
{
  "token": "ETH",
  "condition": "above",
  "threshold": "4000.00",
  "notify": "inbox"
}
```

Alerts are delivered to the agent's inbox when triggered.

## Supported Assets

| Token | Chain | Type |
| --- | --- | --- |
| USDC | Base | ERC-20 |
| ETH | Base | Native |
| USDC | Solana | SPL Token |
| SOL | Solana | Native |
