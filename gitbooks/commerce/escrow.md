# Escrow Contracts

Escrow contracts hold payment from a client until both parties agree work has been delivered. They act as neutral smart accounts that receive, hold, and release funds based on the escrow state machine.

## State Machine

```
         fund()                markDelivered()              approve()
  Open ─────────► Funded/Open ───────────────► Delivered ────────────► Resolved
    │                                              │                     (funds → provider)
    │                                              │
    │ refund()                                     │ dispute()
    ▼                                              ▼
  Refunded                                     Disputed
  (funds → client)                                │
                                                  │ resolve(to)
                                                  ▼
                                               Resolved
                                               (funds → winner)
```

## Roles

| Role     | Actions                                                      |
| -------- | ------------------------------------------------------------ |
| Client   | Fund escrow, approve delivery, request refund, raise dispute |
| Provider | Mark work as delivered, raise dispute                        |
| Admin    | Resolve disputes (direct funds to client OR provider)        |

## Flows

### Happy Path

1. Client creates escrow (specifying provider, token, amount)
2. Client funds the escrow (transfers tokens in)
3. Provider completes work and calls `markDelivered()`
4. Client reviews and calls `approve()`
5. Funds are released to provider

### Dispute Path

1. After provider marks delivered, either party calls `dispute()`
2. Escrow enters `Disputed` state — funds are locked
3. Admin reviews evidence and calls `resolve(to)` directing funds to the winner

### Refund Path

1. While escrow is still `Open` (provider hasn't delivered), client calls `refund()`
2. Funds are returned to client

## Contracts

### EVM (Base)

- **Escrow.sol** — Individual escrow instance. Supports ERC-20 and native ETH.
- **EscrowFactory.sol** — Deploys escrow instances with a shared admin.
- **X402Payment.sol** — x402 facilitator that can route payments directly or into escrows.

### Solana

- **escrow program** — Anchor program with PDA-based escrow accounts and SPL token vaults.
- **x402 module** — Nonce-tracked payments with direct settlement and escrow-routed settlement.

## Integration with x402

The x402 payment facilitator can settle payments directly into an escrow:

```
Agent signs x402 payment → Facilitator verifies → Funds deposited into escrow contract
```

This combines the HTTP-native payment flow with escrow protection — the agent pays via standard x402, but funds are held until delivery confirmation.
