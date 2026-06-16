import { assert } from "chai";
import {
  escrowProgram,
  jobProgram,
  payer,
  newMint,
  ata,
  fundSol,
  createVault,
  vaultAuthorityPda,
  jobPda,
  id32,
  expectRevert,
  Keypair,
  PublicKey,
  SystemProgram,
} from "./setup";

const FEE_BPS = 250;

describe("authorization scoping (job custody isolation)", () => {
  let mint: PublicKey;
  let feeAccount: PublicKey;

  before(async () => {
    mint = await newMint();
    feeAccount = await ata(mint, payer.publicKey);
  });

  it("records the disburse authority as the settlement_job vault_authority PDA", async () => {
    const { vault } = await createVault(jobProgram.programId, mint, feeAccount, "scope-auth-job");
    const expected = vaultAuthorityPda(jobProgram.programId);
    const account = await escrowProgram.account.vault.fetch(vault);

    assert.equal(
      account.authority.toBase58(),
      expected.toBase58(),
      "authority must be settlement_job vault_authority PDA",
    );
  });

  it("a vault is scoped to its single owning job record", async () => {
    const ownerA = jobPda(id32("scope-owner-job-A"));
    const { vault } = await createVault(
      jobProgram.programId,
      mint,
      feeAccount,
      "scope-owner-job-vault",
      ownerA,
    );
    const idB = id32("scope-owner-job-B");
    const client = Keypair.generate();
    await fundSol(client.publicKey);

    await expectRevert(
      jobProgram.methods
        .createJob(idB, Keypair.generate().publicKey, Keypair.generate().publicKey, FEE_BPS)
        .accounts({
          job: jobPda(idB),
          client: client.publicKey,
          vault,
          systemProgram: SystemProgram.programId,
        })
        .signers([client])
        .rpc(),
      "sibling job claiming another job's vault",
    );
  });
});
