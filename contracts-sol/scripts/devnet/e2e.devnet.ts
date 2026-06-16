// End-to-end devnet exercise of the remaining on-chain custody + job settlement
// programs using real SPL (test USDC):
//
//   escrow   : create vault -> x402 deposit -> balance tracked
//   job      : create -> fund -> deliver -> approve (provider paid minus rake)
//
// Reads scripts/devnet/.env.devnet. The SDK has no Anchor client for these
// programs, so this talks to them directly via their IDLs. Parties that must
// sign are ephemeral keypairs the script funds from the deployer; balances are
// verified over RPC. Set TESTER_KEYPAIR to make your own wallet a visible job
// provider.
//
// Run:  NODE_OPTIONS=--no-experimental-strip-types \
//         yarn ts-mocha -p ./tsconfig.json -t 1000000 scripts/devnet/e2e.devnet.ts
import { assert } from "chai";
import { readFileSync } from "fs";
import { resolve, isAbsolute, join } from "path";
import { createHash } from "crypto";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
  Transaction,
} from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  getAccount,
  transfer as splTransfer,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";

// --- config / env -----------------------------------------------------------

const CONTRACTS_DIR = resolve(__dirname, "..", "..");
const ENV_FILE = join(__dirname, ".env.devnet");

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(ENV_FILE, "utf8");
  } catch {
    throw new Error(`missing ${ENV_FILE} (copy .env.devnet.example and fill it in)`);
  }
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const env = loadEnv();
function need(key: string): string {
  const v = env[key];
  if (!v) throw new Error(`set ${key} in ${ENV_FILE}`);
  return v;
}
function keypairPath(p: string): string {
  return isAbsolute(p) ? p : resolve(CONTRACTS_DIR, p);
}
function keypairFromSecret(secret: string): Keypair {
  const s = secret.trim();
  const bytes = s.startsWith("[")
    ? Uint8Array.from(JSON.parse(s) as Array<number>)
    : bs58.decode(s);
  return Keypair.fromSecretKey(bytes);
}
function loadKeypairFile(p: string): Keypair {
  const bytes = JSON.parse(readFileSync(keypairPath(p), "utf8")) as Array<number>;
  return Keypair.fromSecretKey(Uint8Array.from(bytes));
}
// Resolve a role to a Keypair: prefer a raw private key (<ROLE>_PRIVATE_KEY,
// base58 or JSON array), else a keypair file path (<ROLE>_KEYPAIR).
function resolveKeypair(role: string, required: boolean): Keypair | null {
  const pk = env[`${role}_PRIVATE_KEY`];
  if (pk) return keypairFromSecret(pk);
  const file = env[`${role}_KEYPAIR`];
  if (file) return loadKeypairFile(file);
  if (required) throw new Error(`set ${role}_PRIVATE_KEY or ${role}_KEYPAIR in ${ENV_FILE}`);
  return null;
}

const RPC = need("DEVNET_RPC_URL");
const deployer = resolveKeypair("DEPLOYER", true) as Keypair;
const mint = new PublicKey(need("USDC_MINT"));
const relay = resolveKeypair("RELAY", false) ?? Keypair.generate();
const tester = resolveKeypair("TESTER", false);
const AMOUNT = Number(env.AMOUNT_BASE || "10000");

const connection = new Connection(RPC, "confirmed");
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(deployer), {
  commitment: "confirmed",
});
anchor.setProvider(provider);

// Loaded as `any`: with a runtime-loaded IDL there are no compile-time account
// or method types to gain, and the generic Program<Idl> types otherwise trip
// "excessively deep" instantiation on the .methods/.account chains.
function loadProgram(name: string): any {
  const idl = JSON.parse(
    readFileSync(join(CONTRACTS_DIR, "target", "idl", `${name}.json`), "utf8"),
  ) as anchor.Idl;
  return new anchor.Program(idl, provider);
}
const escrowProgram = loadProgram("escrow");
const jobProgram = loadProgram("settlement_job");

// --- helpers ----------------------------------------------------------------

const enc = (s: string): Buffer => Buffer.from(s);
function id32(label: string): Array<number> {
  return Array.from(createHash("sha256").update(label).digest());
}
const tag = (): string => `${Date.now().toString(36)}`; // unique-per-run suffix

function vaultPda(id: Array<number>): PublicKey {
  return PublicKey.findProgramAddressSync([enc("vault"), Buffer.from(id)], escrowProgram.programId)[0];
}
function noncePda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([enc("nonce"), owner.toBuffer()], escrowProgram.programId)[0];
}
function vaultAuthorityPda(program: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([enc("vault_authority")], program)[0];
}
function recordPda(program: PublicKey, seed: string, id: Array<number>): PublicKey {
  return PublicKey.findProgramAddressSync([enc(seed), Buffer.from(id)], program)[0];
}
// Monotonic nonce source. The escrow nonce tracker is a persistent per-payer
// account requiring strictly increasing nonces, so seeding from the clock keeps
// it increasing run-to-run.
let nonceSeq = Date.now();
const nextNonce = (): number => ++nonceSeq;

function payload(payerKey: PublicKey, amount: number): {
  amount: BN;
  payer: PublicKey;
  payee: PublicKey;
  nonce: BN;
  expiry: BN;
} {
  return {
    amount: new BN(amount),
    payer: payerKey,
    payee: payerKey,
    nonce: new BN(nextNonce()),
    expiry: new BN(Math.floor(Date.now() / 1000) + 3600),
  };
}

async function giveSol(to: PublicKey, sol: number): Promise<void> {
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: deployer.publicKey,
      toPubkey: to,
      lamports: Math.floor(sol * LAMPORTS_PER_SOL),
    }),
  );
  await provider.sendAndConfirm(tx, []);
}
async function ataFor(owner: PublicKey): Promise<PublicKey> {
  return (await getOrCreateAssociatedTokenAccount(connection, deployer, mint, owner, true)).address;
}
async function giveUsdc(to: PublicKey, amount: number): Promise<PublicKey> {
  const src = await ataFor(deployer.publicKey);
  const dst = await ataFor(to);
  await splTransfer(connection, deployer, src, dst, deployer, amount);
  return dst;
}
async function bal(token: PublicKey): Promise<bigint> {
  return (await getAccount(connection, token)).amount;
}
async function initNonce(owner: Keypair): Promise<void> {
  // The nonce tracker persists on-chain; a reused wallet (e.g. the tester across
  // modes, or a rerun) already has one. Initialize only if it doesn't exist.
  const tracker = noncePda(owner.publicKey);
  if (await connection.getAccountInfo(tracker)) return;
  await escrowProgram.methods
    .initNonce()
    .accounts({
      nonceTracker: tracker,
      owner: owner.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([owner])
    .rpc();
}
/** A funded, signing participant (SOL for rent + `usdc` base units if > 0). */
async function newParty(usdc: number): Promise<Keypair> {
  const kp = Keypair.generate();
  await giveSol(kp.publicKey, 0.05);
  if (usdc > 0) await giveUsdc(kp.publicKey, usdc);
  return kp;
}
async function createVault(
  settlementProgram: PublicKey,
  feeAccount: PublicKey,
  label: string,
  owner: PublicKey,
): Promise<{ vault: PublicKey; vaultToken: PublicKey }> {
  const id = id32(label);
  const vault = vaultPda(id);
  const vaultToken = Keypair.generate();
  await escrowProgram.methods
    .createVault(id, settlementProgram, owner)
    .accounts({
      vault,
      vaultToken: vaultToken.publicKey,
      creator: deployer.publicKey,
      mint,
      feeAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
    })
    .signers([vaultToken])
    .rpc();
  return { vault, vaultToken: vaultToken.publicKey };
}
const rake = (amount: number, bps: number): number => Math.floor((amount * bps) / 10000);

// --- suite ------------------------------------------------------------------

describe("devnet e2e (escrow + settlement modes, real USDC)", function () {
  this.timeout(600_000);
  let feeAccount: PublicKey; // deployer's USDC ATA; receives all rakes

  before(async () => {
    const lamports = await connection.getBalance(deployer.publicKey);
    feeAccount = await ataFor(deployer.publicKey);
    const usdc = await bal(feeAccount);
    console.log(`    deployer ${deployer.publicKey.toBase58()}`);
    console.log(`    SOL ${(lamports / LAMPORTS_PER_SOL).toFixed(4)}  |  USDC ${usdc} base units`);
    const haveRelay = !!(env.RELAY_PRIVATE_KEY || env.RELAY_KEYPAIR);
    console.log(`    relay  ${relay.publicKey.toBase58()}${haveRelay ? "" : " (ephemeral)"}`);
    console.log(`    tester ${tester ? tester.publicKey.toBase58() : "(none — using ephemeral parties)"}`);
    if (tester) await giveSol(tester.publicKey, 0.05);
    await giveSol(relay.publicKey, 0.02);
  });

  it("escrow: x402 deposit lands in the vault and is tracked", async () => {
    const owner = recordPda(jobProgram.programId, "job", id32(`escrow-${tag()}`));
    const { vault, vaultToken } = await createVault(
      jobProgram.programId,
      feeAccount,
      `escrow-${tag()}`,
      owner,
    );
    const depositor = await newParty(AMOUNT);
    await initNonce(depositor);
    const depositorToken = await ataFor(depositor.publicKey);

    await escrowProgram.methods
      .deposit(payload(depositor.publicKey, AMOUNT))
      .accounts({
        vault,
        nonceTracker: noncePda(depositor.publicKey),
        payer: depositor.publicKey,
        payerToken: depositorToken,
        vaultToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([depositor])
      .rpc();

    assert.equal((await escrowProgram.account.vault.fetch(vault)).deposited.toNumber(), AMOUNT);
    assert.equal(await bal(vaultToken), BigInt(AMOUNT));
    console.log(`    ✓ deposited ${AMOUNT} into vault ${vault.toBase58()}`);
  });

  it("job: fund -> deliver -> approve releases to provider minus rake", async () => {
    const FEE_BPS = 250;
    const label = `job-${tag()}`;
    const jobId = id32(label);
    const job = recordPda(jobProgram.programId, "job", jobId);
    const { vault, vaultToken } = await createVault(jobProgram.programId, feeAccount, label, job);

    const client = await newParty(AMOUNT);
    // Provider must sign delivery, so it needs a key: use the tester wallet if
    // provided (visible payout), else an ephemeral provider.
    const providerKp = tester ?? (await newParty(0));
    if (!tester) await giveSol(providerKp.publicKey, 0.02);
    const providerToken = await ataFor(providerKp.publicKey);
    const controller = relay.publicKey;

    await jobProgram.methods
      .createJob(jobId, providerKp.publicKey, controller, FEE_BPS)
      .accounts({ job, client: client.publicKey, vault, systemProgram: SystemProgram.programId })
      .signers([client])
      .rpc();

    await initNonce(client);
    const clientToken = await ataFor(client.publicKey);
    await jobProgram.methods
      .fund(payload(client.publicKey, AMOUNT))
      .accounts({
        job,
        vault,
        nonceTracker: noncePda(client.publicKey),
        client: client.publicKey,
        clientToken,
        vaultToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        escrowProgram: escrowProgram.programId,
      })
      .signers([client])
      .rpc();

    await jobProgram.methods
      .markDelivered()
      .accounts({ job, actor: providerKp.publicKey })
      .signers([providerKp])
      .rpc();

    const provBefore = await bal(providerToken);
    const feeBefore = await bal(feeAccount);
    await jobProgram.methods
      .approve()
      .accounts({
        job,
        actor: client.publicKey,
        vault,
        vaultAuthority: vaultAuthorityPda(jobProgram.programId),
        vaultToken,
        recipientToken: providerToken,
        feeToken: feeAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        escrowProgram: escrowProgram.programId,
      })
      .signers([client])
      .rpc();

    const fee = rake(AMOUNT, FEE_BPS);
    assert.equal((await bal(providerToken)) - provBefore, BigInt(AMOUNT - fee));
    assert.equal((await bal(feeAccount)) - feeBefore, BigInt(fee));
    console.log(`    ✓ provider got ${AMOUNT - fee}, rake ${fee} (provider ${providerKp.publicKey.toBase58()})`);
  });

});
