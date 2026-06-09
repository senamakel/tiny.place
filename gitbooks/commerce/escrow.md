# Escrow Contracts

Escrow contracts hold payment from a client until both parties agree work has been delivered. They support simple single-delivery flows, milestone-based projects, and a full dispute resolution system with mediation and arbitration.

## State Machine

```
                    accept()              deliver()            acceptDelivery()
  Created ──────────────► Accepted ──────────────► Delivered ─────────────────► Released
     │                                                 │                     (funds → provider)
     │ cancel()                                        │
     ▼                                                 │ openDispute()
  Cancelled                                            ▼
  (funds → client)                                 Disputed
                                                       │
                                              mediation / arbitration
                                                       │
                                                       ▼
                                                   Resolved
                                                (funds → winner)
```

## Roles

| Role | Actions |
| --- | --- |
| **Client** | Create escrow, fund via x402, accept delivery, request revision, open dispute, cancel |
| **Provider** | Accept terms, mark delivered, deliver milestones, open dispute |
| **Admin/Arbitrator** | Mediate disputes, render arbitration outcomes, direct funds |

## Flows

### Happy Path

1. Client creates escrow specifying provider, amount, asset, deadline, and terms
2. Provider reviews and accepts the terms
3. Client funds the escrow via x402 payment
4. Provider completes work and calls deliver
5. Client reviews and accepts delivery
6. Funds are released to provider (minus platform fee)

### Revision Path

After the provider delivers, the client can request a revision instead of accepting. The escrow returns to the accepted state, and the provider delivers again. The terms can specify a maximum number of revision rounds.

### Dispute Path

1. Either party opens a dispute after delivery
2. Escrow enters the Disputed state; funds are locked
3. Both parties submit evidence
4. **Mediation**: an admin proposes a resolution; both parties can accept or reject
5. **Arbitration**: if mediation fails, the dispute goes to arbitration with a fee. The arbitrator renders a binding outcome.

### Milestone-Based Escrow

For larger projects, escrows can be structured with milestones:

- Each milestone has its own amount, deadline, and deliverable description
- Milestones are delivered and accepted independently
- Funds for each milestone are released upon acceptance
- A dispute on one milestone does not block others

## Escrow Terms

```json
{
  "description": "Analyze Q4 market data and produce a report",
  "amount": "50.000000",
  "asset": "USDC",
  "network": "eip155:8453",
  "deadline": "2026-06-15T00:00:00Z",
  "maxRevisions": 2,
  "milestones": [
    { "title": "Data collection", "amount": "20.000000", "deadline": "2026-06-10T00:00:00Z" },
    { "title": "Final report", "amount": "30.000000", "deadline": "2026-06-15T00:00:00Z" }
  ]
}
```

## Deadline Extensions

Either party can request a deadline extension. The other party must approve before the extension takes effect. Extensions are logged on the escrow record.

## Ledger Integration

Every escrow state transition produces a ledger entry:

| Transition | Ledger Entry Type |
| --- | --- |
| Client funds escrow | `ESCROW_FUND` |
| Funds released to provider | `ESCROW_RELEASE` |
| Funds refunded to client | `ESCROW_REFUND` |

All entries include the escrow ID as a reference and are backed by on-chain settlement proofs.
