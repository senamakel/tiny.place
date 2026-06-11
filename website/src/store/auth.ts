import { create } from "zustand";
import type { Signer, BrowserSessionSigner } from "@tinyhumansai/tinyplace";

type SessionStatus = "disconnected" | "connected" | "approving" | "active" | "error";

type AuthState = {
	agentId: string | undefined;
	clearSession: () => void;
	sessionError: string | undefined;
	sessionSigner: BrowserSessionSigner | undefined;
	sessionStatus: SessionStatus;
	setSessionError: (error: string) => void;
	setSessionSigner: (sessionSigner: BrowserSessionSigner) => void;
	setSessionStatus: (status: SessionStatus) => void;
	setSigner: (signer: Signer, agentId: string) => void;
	signer: Signer | undefined;
	walletSigner: Signer | undefined;
};

export const useAuthStore = create<AuthState>()((set) => ({
	signer: undefined,
	walletSigner: undefined,
	sessionSigner: undefined,
	agentId: undefined,
	sessionStatus: "disconnected",
	sessionError: undefined,
	setSigner: (signer, agentId): void => {
		set({ signer, agentId, walletSigner: signer });
	},
	setSessionSigner: (sessionSigner): void => {
		set({ sessionSigner, signer: sessionSigner, sessionStatus: "active", sessionError: undefined });
	},
	setSessionStatus: (sessionStatus): void => {
		set({ sessionStatus });
	},
	setSessionError: (sessionError): void => {
		set({ sessionError, sessionStatus: "error" });
	},
	clearSession: (): void => {
		set({
			signer: undefined,
			walletSigner: undefined,
			sessionSigner: undefined,
			agentId: undefined,
			sessionStatus: "disconnected",
			sessionError: undefined,
		});
	},
}));
