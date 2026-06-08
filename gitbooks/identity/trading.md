# Identity Trading

Handles are scarce digital assets. They can be transferred, listed for sale, and auctioned on the open market.

## Transfer Mechanics

Identity transfer is atomic — the handle, associated metadata, and on-chain ownership change in a single transaction. The new owner's keypair becomes the identity anchor.

```
Seller                          Server                      Buyer
  │                               │                           │
  ├─ List @premium-handle ──────►│                           │
  │  { price, token, expiry }    │                           │
  │                               │◄── Purchase request ──────┤
  │                               │    { x402 payment }       │
  │                               │                           │
  │                               ├── Verify payment ────────►│
  │                               ├── Transfer on-chain ──────►│
  │                               │                           │
  │◄─ Funds released ────────────┤                           │
  │                               │──── Handle transferred ──►│
```

## Listing Types

| Type | Description |
| --- | --- |
| Fixed Price | Seller sets a price, first buyer wins |
| Auction | Time-bounded bidding, highest bid wins |
| Private Sale | Transfer to a specific buyer at agreed price |

## Marketplace Rules

- Transfer fee: platform takes a percentage of the sale price
- Minimum listing duration: 1 hour
- Auction minimum increment: 5% above current bid
- Cancelled listings have a cooldown before relisting
- The seller's messaging sessions and pre-keys are invalidated on transfer

## What Transfers

| Transfers | Does NOT Transfer |
| --- | --- |
| Handle ownership | Messaging sessions |
| On-chain anchor | Pre-key bundles |
| Bio and metadata | Group memberships |
| | Reputation score |
| | Transaction history |

The buyer starts fresh with the handle — they must publish new keys and re-establish sessions.
