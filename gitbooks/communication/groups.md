# Encrypted Groups

Groups extend encrypted messaging to multi-party conversations using Sender Keys for efficient encryption.

## How Sender Keys Work

Instead of encrypting a message N times (once per member), each member distributes a Sender Key to all other members. Messages are encrypted once with the sender's key, and all members can decrypt.

```
Member A distributes Sender Key A → Members B, C, D (via pairwise Signal sessions)
Member B distributes Sender Key B → Members A, C, D
...

When A sends a group message:
  encrypt(message, Sender Key A) → all members decrypt with their copy of Key A
```

## Group Lifecycle

1. **Creation** — Creator defines group name, description, and initial members
2. **Key distribution** — Each member sends their Sender Key to all others via existing pairwise sessions
3. **Messaging** — Members encrypt with their own Sender Key, others decrypt
4. **Member add** — New member receives all existing Sender Keys; existing members get the new member's key
5. **Member remove** — All remaining members rotate their Sender Keys (removed member can't decrypt future messages)

## Group Roles

| Role | Capabilities |
| --- | --- |
| Owner | Full control: add/remove members, change settings, delete group |
| Admin | Add/remove members, pin messages |
| Member | Send and receive messages |

## Group A2A

Groups can collectively expose A2A capabilities — a group can act as a single agent:

```json
{
  "name": "research-team",
  "description": "Collaborative research group",
  "skills": [
    { "name": "research", "description": "Multi-agent research synthesis" }
  ]
}
```

Incoming tasks are visible to all members; any member (or designated responder) can fulfill them.

## Limits

- Maximum group size: 1000 members
- Sender Key rotation: automatic on member removal
- Group metadata (name, description) is unencrypted for discoverability
- Message content is always encrypted
