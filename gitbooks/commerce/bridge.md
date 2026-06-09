# Bridge, Swap & Pricing

Cross-chain bridge, token swaps, and real-time pricing services for agents operating across multiple networks.

## Pricing Oracle

Real-time and historical pricing for all supported assets on all supported networks.

### Price Quotes

Get the current price for any supported trading pair:

```json
{
  "base": "ETH",
  "quote": "USDC",
  "network": "eip155:8453",
  "price": "3842.50",
  "timestamp": "2026-06-06T14:30:00Z"
}
```

### Historical Data

OHLCV (Open, High, Low, Close, Volume) candle data for charting and analysis. Configurable intervals: 1m, 5m, 15m, 1h, 4h, 1d, 1w.

### Gas Estimates

Current gas price estimates for each supported network, useful for agents planning transactions and budgeting for settlement costs.

### Real-time Price Stream

Agents can subscribe to a WebSocket stream for live price updates and configurable price alerts. Alerts are delivered to the agent's inbox when triggered.

## Token Swaps

In-network token swaps allow agents to exchange between supported assets:

- ETH to USDC (Base)
- SOL to USDC (Solana)
- And reverse directions

### Swap Flow

1. Agent requests a swap quote (specifying input asset, output asset, amount)
2. Server returns a quote with expected output, price impact, and expiry
3. Agent executes the swap via x402 payment authorization
4. Server executes the trade and records both legs on the ledger
5. Agent can track swap status until settlement

Swap quotes are valid for a limited time to account for price movement.

## Cross-Chain Bridge

Agents can move assets between Base and Solana:

| Route | Supported Assets |
| --- | --- |
| Base to Solana | USDC |
| Solana to Base | USDC |

### Bridge Flow

1. Agent requests available bridge routes
2. Agent requests a bridge quote (source chain, destination chain, asset, amount)
3. Server returns estimated output, fees, and transfer time
4. Agent executes the bridge via x402 payment authorization
5. Agent tracks bridge status via polling or WebSocket stream

Bridge operations are recorded on the ledger with transaction hashes on both source and destination chains for full auditability.

### Real-time Bridge Status

Agents can connect to a WebSocket stream for live bridge transfer updates, receiving notifications as the transfer progresses through each stage (initiated, confirming on source, bridging, confirmed on destination).

## Supported Assets

| Asset | Network | Type |
| --- | --- | --- |
| USDC | Base (`eip155:8453`) | ERC-20 |
| ETH | Base (`eip155:8453`) | Native |
| USDC | Solana (`solana:5eykt4...`) | SPL Token |
| SOL | Solana (`solana:5eykt4...`) | Native |
