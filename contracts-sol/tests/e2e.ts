// End-to-end scenario for the remaining on-chain custody + job settlement
// programs. Games no longer use contracts.
import { assert } from "chai";
import {
  escrowProgram,
  jobProgram,
  payer,
  newMint,
  ata,
  fundTokens,
  fundSol,
  tokenBalance,
  createVault,
  initNonce,
  noncePda,
  jobPda,
  vaultAuthorityPda,
  payload,
  id32,
  BN,
  Keypair,
  PublicKey,
  SystemProgram,
  TOKEN_PROGRAM_ID,
} from "./setup";

describe("e2e — job settlement fund conservation", () => {
  let mint: PublicKey;
  let feeAccount: PublicKey;

  before(async () => {
    mint = await newMint();
    feeAccount = await ata(mint, payer.publicKey);
  });

  async function vaultState(vault: PublicKey): Promise<{ deposited: number; disbursed: number }> {
    const account = await escrowProgram.account.vault.fetch(vault);
    return { deposited: account.deposited.toNumber(), disbursed: account.disbursed.toNumber() };
  }

  it("job: fund -> deliver -> approve pays provider + fee == deposit, vault drained", async () => {
    const fundingAmount = 5000;
    const feeBps = 250;
    const client = Keypair.generate();
    const providerKeypair = Keypair.generate();
    const controller = Keypair.generate();
    await fundSol(client.publicKey);

    const { vault, vaultToken } = await createVault(jobProgram.programId, mint, feeAccount, "e2e-job");
    const jobId = id32("e2e-job");
    const job = jobPda(jobId);

    await jobProgram.methods
      .createJob(jobId, providerKeypair.publicKey, controller.publicKey, feeBps)
      .accounts({ job, client: client.publicKey, vault, systemProgram: SystemProgram.programId })
      .signers([client])
      .rpc();

    const clientToken = await fundTokens(mint, client.publicKey, fundingAmount);
    await initNonce(client);
    await jobProgram.methods
      .fund(payload(client.publicKey, fundingAmount, 1))
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
      .accounts({ job, actor: providerKeypair.publicKey })
      .signers([providerKeypair])
      .rpc();

    const providerToken = await ata(mint, providerKeypair.publicKey);
    const providerBefore = await tokenBalance(providerToken);
    const feeBefore = await tokenBalance(feeAccount);

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

    const providerDelta = Number((await tokenBalance(providerToken)) - providerBefore);
    const feeDelta = Number((await tokenBalance(feeAccount)) - feeBefore);
    assert.equal(providerDelta + feeDelta, fundingAmount, "provider + fee must equal deposit");
    assert.equal(Number(await tokenBalance(vaultToken)), 0, "vault fully drained");

    const state = await vaultState(vault);
    assert.equal(state.disbursed, state.deposited, "disbursed == deposited");
  });
});
