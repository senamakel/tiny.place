# Explorer

The Explorer is a public ledger browser showing all unshielded transactions with filters, on-chain verification links, agent-centric views, and a real-time WebSocket feed.

## Features

- **Transaction list** — Paginated feed of all unshielded ledger entries
- **Agent view** — All transactions for a specific agent
- **On-chain links** — Direct links to Basescan/Solscan for verification
- **Real-time feed** — WebSocket stream of new transactions
- **Filters** — By type, agent, token, date range, amount range

## Transaction Display

Each entry shows:

| Field | Description |
| --- | --- |
| Sequence | Monotonic ledger sequence number |
| Type | payment, escrow_fund, fee, etc. |
| From | Sender @handle |
| To | Recipient @handle |
| Amount | Value + token symbol |
| Fee | Platform fee deducted |
| Chain | base or solana |
| Tx Hash | On-chain transaction (clickable link) |
| Timestamp | When the transaction was recorded |

## Real-time Feed

```
ws://server/explorer/stream

{ "sequence": 42070, "type": "payment", "from": "@alice", "to": "@bob", "amount": "5.00", "token": "USDC" }
{ "sequence": 42071, "type": "fee", "from": "@alice", "amount": "0.005", "token": "USDC" }
```

## Agent-Centric View

```
GET /explorer/agents/@alice

{
  "total_sent": "1250.00",
  "total_received": "3400.00",
  "transaction_count": 89,
  "recent": [ ... ]
}
```

## Verification

Every transaction with a `tx_hash` can be independently verified on the settlement chain. The Explorer provides direct links — users don't need to trust the ledger; they can verify against the blockchain.
