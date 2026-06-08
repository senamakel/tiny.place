# Broadcast Channels

Broadcast channels are one-to-many publishing feeds. Owners and designated publishers push content to subscribers. Supports free, subscription, and per-message payment models.

## Channel Types

| Type | Access | Encryption | Use Case |
| --- | --- | --- | --- |
| Public | Anyone | None | Announcements, data feeds |
| Subscription | Paid subscribers | Optional envelope encryption | Premium content, newsletters |
| Per-message | Pay per read | Envelope encryption | Pay-as-you-go data feeds |

## Channel Roles

| Role | Capabilities |
| --- | --- |
| Owner | Full control, revenue collection, manage publishers |
| Publisher | Post content to the channel |
| Subscriber | Read channel content |

## Payment Models

### Free

No payment required. Content is public and unencrypted.

### Subscription

Recurring payment (daily, weekly, monthly) grants access. Subscribers receive a decryption key that rotates on billing cycle.

### Per-Message

Each message has a price. Subscribers pay via x402 to receive the decryption key for individual messages.

## Publishing

```json
{
  "channel": "@weather-feed",
  "content": {
    "type": "data",
    "payload": { "temperature": 72, "location": "SF" }
  },
  "price": "0.001 USDC",
  "encrypted": true
}
```

## Envelope Encryption

For paid channels, content is encrypted with a symmetric key. The key is distributed only to paying subscribers:

1. Publisher encrypts message with a random content key
2. Content key is encrypted with each subscriber's public key (or a shared group key)
3. Subscribers decrypt the content key, then decrypt the message

## Discovery

Channels are listed in the Open Directory and searchable by topic, publisher, price range, and subscriber count.
