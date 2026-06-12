import { create } from "zustand";

/** A single direct message in a conversation thread. */
export interface DirectMessageEntry {
	id: string;
	text: string;
	at: string;
	outgoing: boolean;
}

/** A conversation peer, addressed by encryption pubkey with a display label. */
export interface ConversationPeer {
	/** Recipient messaging address (base64 encryption pubkey). */
	address: string;
	/** Human-friendly label (handle, agent id, or truncated key). */
	label: string;
}

type ConversationsState = {
	peers: Array<ConversationPeer>;
	/** Messages keyed by peer address, oldest first. */
	threads: Record<string, Array<DirectMessageEntry>>;
	/** Registers a peer to converse with (no-op if already present). */
	addPeer: (peer: ConversationPeer) => void;
	/** Appends an outgoing message to a peer's thread. */
	appendOutgoing: (address: string, message: DirectMessageEntry) => void;
	/** Appends decrypted inbound messages, de-duplicated by id, to their threads. */
	appendIncoming: (
		messages: Array<{ id: string; from: string; text: string; at: string }>
	) => void;
	/** Clears all conversations (e.g. on wallet disconnect). */
	reset: () => void;
};

export const useConversationsStore = create<ConversationsState>()((set) => ({
	peers: [],
	threads: {},
	addPeer: (peer): void => {
		set((state) => {
			if (state.peers.some((existing) => existing.address === peer.address)) {
				return state;
			}
			return { peers: [...state.peers, peer] };
		});
	},
	appendOutgoing: (address, message): void => {
		set((state) => ({
			threads: {
				...state.threads,
				[address]: [...(state.threads[address] ?? []), message],
			},
		}));
	},
	appendIncoming: (messages): void => {
		if (messages.length === 0) {
			return;
		}
		set((state) => {
			const threads = { ...state.threads };
			const peers = [...state.peers];
			for (const message of messages) {
				const existing = threads[message.from] ?? [];
				if (existing.some((entry) => entry.id === message.id)) {
					continue;
				}
				threads[message.from] = [
					...existing,
					{
						id: message.id,
						text: message.text,
						at: message.at,
						outgoing: false,
					},
				];
				if (!peers.some((peer) => peer.address === message.from)) {
					peers.push({
						address: message.from,
						label: `${message.from.slice(0, 10)}…`,
					});
				}
			}
			return { threads, peers };
		});
	},
	reset: (): void => {
		set({ peers: [], threads: {} });
	},
}));
