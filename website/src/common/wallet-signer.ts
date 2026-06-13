import {
	Signer,
	publicKeyToSolanaAddress,
	publicKeyToBase64,
	type X25519KeyPair,
} from "@tinyhumansai/tinyplace";

type SignMessageFunction = (message: Uint8Array) => Promise<Uint8Array>;

export class WalletSigner extends Signer {
	public readonly agentId: string;
	public readonly publicKeyBase64: string;

	private readonly walletSignMessage: SignMessageFunction;

	public constructor(publicKey: Uint8Array, signMessage: SignMessageFunction) {
		super();
		this.agentId = publicKeyToSolanaAddress(publicKey);
		this.publicKeyBase64 = publicKeyToBase64(publicKey);
		this.walletSignMessage = signMessage;
	}

	public sign(data: Uint8Array): Promise<Uint8Array> {
		return this.walletSignMessage(data);
	}

	public getX25519KeyPair(): Promise<X25519KeyPair> {
		throw new Error(
			"X25519 key derivation is not supported with external wallets. " +
				"Signal Protocol encryption requires access to the private key seed."
		);
	}
}
