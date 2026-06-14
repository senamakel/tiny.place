import {
	Connection,
	PublicKey,
	Transaction,
	TransactionInstruction,
} from "@solana/web3.js";
import {
	SOLANA_TOKEN_PROGRAM_ID,
	SOLANA_USDC_MINT,
} from "@tinyhumansai/tinyplace";

// The Associated Token Account program. Not exported by the SDK, so it is
// defined here alongside the other Solana program ids it complements.
const ASSOCIATED_TOKEN_PROGRAM_ID =
	"ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";

const TOKEN_TRANSFER_CHECKED_INSTRUCTION = 12;
const TOKEN_APPROVE_CHECKED_INSTRUCTION = 13;
const ATA_CREATE_IDEMPOTENT_INSTRUCTION = 1;
const USDC_DECIMALS = 6;

/** Encodes amount (base units) as a little-endian u64. */
function encodeU64LittleEndian(amount: string): Uint8Array {
	let value = BigInt(amount);
	const bytes = new Uint8Array(8);
	for (let index = 0; index < 8; index += 1) {
		bytes[index] = Number(value & 0xffn);
		value >>= 8n;
	}
	return bytes;
}

/** Derives the canonical Associated Token Account for owner + mint. */
export function associatedTokenAddress(owner: string, mint: string): PublicKey {
	const [address] = PublicKey.findProgramAddressSync(
		[
			new PublicKey(owner).toBuffer(),
			new PublicKey(SOLANA_TOKEN_PROGRAM_ID).toBuffer(),
			new PublicKey(mint).toBuffer(),
		],
		new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
	);
	return address;
}

/**
 * SPL Token TransferChecked, authorized by the delegate. Account order matches
 * what the backend validator expects: source, mint, destination, authority.
 */
function transferCheckedInstruction(options: {
	source: PublicKey;
	mint: PublicKey;
	destination: PublicKey;
	authority: PublicKey;
	amount: string;
	decimals: number;
}): TransactionInstruction {
	const data = new Uint8Array(10);
	data[0] = TOKEN_TRANSFER_CHECKED_INSTRUCTION;
	data.set(encodeU64LittleEndian(options.amount), 1);
	data[9] = options.decimals;
	return new TransactionInstruction({
		programId: new PublicKey(SOLANA_TOKEN_PROGRAM_ID),
		keys: [
			{ pubkey: options.source, isSigner: false, isWritable: true },
			{ pubkey: options.mint, isSigner: false, isWritable: false },
			{ pubkey: options.destination, isSigner: false, isWritable: true },
			{ pubkey: options.authority, isSigner: true, isWritable: false },
		],
		data: Buffer.from(data),
	});
}

/** Idempotent create of the payee's ATA, funded by the facilitator. */
function createIdempotentAtaInstruction(options: {
	funder: PublicKey;
	associatedAccount: PublicKey;
	owner: PublicKey;
	mint: PublicKey;
}): TransactionInstruction {
	return new TransactionInstruction({
		programId: new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
		keys: [
			{ pubkey: options.funder, isSigner: true, isWritable: true },
			{ pubkey: options.associatedAccount, isSigner: false, isWritable: true },
			{ pubkey: options.owner, isSigner: false, isWritable: false },
			{ pubkey: options.mint, isSigner: false, isWritable: false },
			{
				pubkey: new PublicKey("11111111111111111111111111111111"),
				isSigner: false,
				isWritable: false,
			},
			{
				pubkey: new PublicKey(SOLANA_TOKEN_PROGRAM_ID),
				isSigner: false,
				isWritable: false,
			},
		],
		data: Buffer.from([ATA_CREATE_IDEMPOTENT_INSTRUCTION]),
	});
}

/**
 * SPL Token ApproveChecked: the payer (owner) delegates `delegate` to spend up
 * to `amount` of `mint` from their token account. Signed by the wallet (Phantom)
 * once at login. Account order: source (owner ATA), mint, delegate, owner.
 */
export function approveCheckedInstruction(options: {
	ownerTokenAccount: PublicKey;
	mint: PublicKey;
	delegate: PublicKey;
	owner: PublicKey;
	amount: string;
	decimals?: number;
}): TransactionInstruction {
	const data = new Uint8Array(10);
	data[0] = TOKEN_APPROVE_CHECKED_INSTRUCTION;
	data.set(encodeU64LittleEndian(options.amount), 1);
	data[9] = options.decimals ?? USDC_DECIMALS;
	return new TransactionInstruction({
		programId: new PublicKey(SOLANA_TOKEN_PROGRAM_ID),
		keys: [
			{ pubkey: options.ownerTokenAccount, isSigner: false, isWritable: true },
			{ pubkey: options.mint, isSigner: false, isWritable: false },
			{ pubkey: options.delegate, isSigner: false, isWritable: false },
			{ pubkey: options.owner, isSigner: true, isWritable: false },
		],
		data: Buffer.from(data),
	});
}

/**
 * Builds the one-time delegation approval transaction for the wallet (Phantom)
 * to sign: it grants the browser session key delegate authority over the
 * payer's USDC up to `amount`. The payer is the fee payer for this login tx.
 */
export async function buildApproveTransaction(options: {
	rpcUrl: string;
	payer: string;
	delegate: string;
	amount: string;
	mint?: string;
	decimals?: number;
}): Promise<Transaction> {
	const mint = options.mint ?? SOLANA_USDC_MINT;
	const owner = new PublicKey(options.payer);
	const connection = new Connection(options.rpcUrl, "confirmed");
	const { blockhash } = await connection.getLatestBlockhash("confirmed");
	const transaction = new Transaction();
	transaction.feePayer = owner;
	transaction.recentBlockhash = blockhash;
	transaction.add(
		approveCheckedInstruction({
			ownerTokenAccount: associatedTokenAddress(options.payer, mint),
			mint: new PublicKey(mint),
			delegate: new PublicKey(options.delegate),
			owner,
			amount: options.amount,
			decimals: options.decimals,
		}),
	);
	return transaction;
}

/**
 * Builds and session-signs a delegated USDC transfer (payer ATA → payee ATA,
 * authority = session delegate, fee payer = facilitator) and returns the base64
 * wire transaction with the fee-payer slot left empty for the facilitator. The
 * backend validates it, inserts the fee-payer signature, and submits it.
 */
export async function buildDelegatedTransferTx(options: {
	rpcUrl: string;
	facilitator: string;
	payer: string;
	payee: string;
	amount: string;
	sessionPublicKeyBase64: string;
	signSession: (message: Uint8Array) => Promise<Uint8Array>;
	mint?: string;
	decimals?: number;
	createPayeeAccount?: boolean;
}): Promise<string> {
	const mint = options.mint ?? SOLANA_USDC_MINT;
	const decimals = options.decimals ?? USDC_DECIMALS;
	const facilitator = new PublicKey(options.facilitator);
	const mintKey = new PublicKey(mint);
	const payerAccount = associatedTokenAddress(options.payer, mint);
	const payeeAccount = associatedTokenAddress(options.payee, mint);
	const sessionKey = new PublicKey(
		Buffer.from(options.sessionPublicKeyBase64, "base64"),
	);

	const connection = new Connection(options.rpcUrl, "confirmed");
	const { blockhash } = await connection.getLatestBlockhash("confirmed");

	const transaction = new Transaction();
	transaction.feePayer = facilitator;
	transaction.recentBlockhash = blockhash;
	if (options.createPayeeAccount ?? true) {
		transaction.add(
			createIdempotentAtaInstruction({
				funder: facilitator,
				associatedAccount: payeeAccount,
				owner: new PublicKey(options.payee),
				mint: mintKey,
			}),
		);
	}
	transaction.add(
		transferCheckedInstruction({
			source: payerAccount,
			mint: mintKey,
			destination: payeeAccount,
			authority: sessionKey,
			amount: options.amount,
			decimals,
		}),
	);

	// Session-sign the message; leave the facilitator (fee-payer) slot empty.
	const message = transaction.serializeMessage();
	const signature = await options.signSession(new Uint8Array(message));
	transaction.addSignature(sessionKey, Buffer.from(signature));

	const wire = transaction.serialize({
		requireAllSignatures: false,
		verifySignatures: false,
	});
	return wire.toString("base64");
}
