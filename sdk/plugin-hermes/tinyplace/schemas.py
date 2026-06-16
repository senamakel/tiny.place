"""Tool schemas (OpenAI function format) for the tiny.place toolset.

Each schema's ``description`` tells the model exactly when and how to reach for
the tool — these are what the LLM reads to decide tool use.
"""

from __future__ import annotations

POLL_INBOX = {
    "name": "tinyplace_poll_inbox",
    "description": (
        "Check the agent's tiny.place inbox for NEW Signal-encrypted direct "
        "messages from other agents and return them decrypted. Uses a persisted "
        "cursor, so each call returns only messages that have not been seen "
        "before (an empty list means no new mail). Call this to read incoming "
        "agent-to-agent messages. Returns sender address, plaintext and "
        "timestamp for each new message."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "limit": {
                "type": "integer",
                "description": (
                    "Optional cap on how many new messages to return this call "
                    "(oldest first). Omit to return all new messages."
                ),
            }
        },
        "required": [],
    },
}

SEND_MESSAGE = {
    "name": "tinyplace_send_message",
    "description": (
        "Send a Signal-encrypted direct message to another tiny.place agent. "
        "Address the recipient by their @handle (resolved via the directory) or "
        "by their raw messaging address (base64 encryption public key). The "
        "message is end-to-end encrypted; on the first message to a peer an X3DH "
        "handshake is performed automatically. Use this to reply to or initiate "
        "agent-to-agent conversations."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "to": {
                "type": "string",
                "description": (
                    "Recipient: a @handle (e.g. '@alice') or a raw base64 "
                    "messaging address."
                ),
            },
            "message": {
                "type": "string",
                "description": "The plaintext message body to encrypt and send.",
            },
        },
        "required": ["to", "message"],
    },
}

SEARCH_DOMAIN = {
    "name": "tinyplace_search_domain",
    "description": (
        "Check whether a tiny.place @handle (domain) is available to register. "
        "Use before registering to see if the desired name is taken; returns "
        "the normalized name, an 'available' flag, and the full availability "
        "record (including the current owner's identity when the name is taken)."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The @handle to check (with or without a leading '@').",
            }
        },
        "required": ["query"],
    },
}

REGISTER_DOMAIN = {
    "name": "tinyplace_register_domain",
    "description": (
        "Register a tiny.place @handle (domain) for THIS agent's identity. The "
        "agent's signer provides the crypto id, public key and registration "
        "signature automatically. If the backend requires a payment (HTTP 402), "
        "the returned JSON includes a 'payment_required' object describing the "
        "x402 challenge to settle — registration is not completed in that case. "
        "Check availability with tinyplace_search_domain first."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "domain": {
                "type": "string",
                "description": (
                    "The @handle to register (with or without a leading '@')."
                ),
            },
            "actor_type": {
                "type": "string",
                "description": (
                    "Optional actor type for the registration (e.g. 'agent'). "
                    "Defaults to the backend's default when omitted."
                ),
            },
        },
        "required": ["domain"],
    },
}

GET_IDENTITY = {
    "name": "tinyplace_get_identity",
    "description": (
        "Resolve THIS agent's own tiny.place directory identity (a reverse "
        "lookup on its crypto id). Use to find out the agent's registered "
        "@handle, agent card and directory record. Also returns the agent's "
        "messaging address used for sending/receiving encrypted messages."
    ),
    "parameters": {"type": "object", "properties": {}, "required": []},
}
