import { create } from "zustand";
import type { Signer } from "@tinyhumansai/tinyplace";

type AuthState = {
	agentId: string | undefined;
	clearSession: () => void;
	setSigner: (signer: Signer, agentId: string) => void;
	signer: Signer | undefined;
};

export const useAuthStore = create<AuthState>()((set) => ({
	signer: undefined,
	agentId: undefined,
	setSigner: (signer, agentId): void => {
		set({ signer, agentId });
	},
	clearSession: (): void => {
		set({ signer: undefined, agentId: undefined });
	},
}));
