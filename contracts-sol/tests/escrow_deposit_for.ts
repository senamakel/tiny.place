import { assert } from "chai";
import { approve } from "@solana/spl-token";
import {
  escrowProgram,
  jobProgram,
  payer,
  connection,
  newMint,
  ata,
  fundTokens,
  fundSol,
  tokenBalance,
  createVault,
  initNonce,
  noncePda,
  payload,
  expectRevert,
  Keypair,
  PublicKey,
  TOKEN_PROGRAM_ID,
} from "./setup";

// deposit_for: a session-wallet DELEGATE moves the payer's funds into the vault.
// The payer never signs — they `approve`d the delegate once; the SPL token
// program enforces that approval. A separate fee payer pays the gas.
describe("escrow deposit_for (delegated deposit)", () => {
  let mint: PublicKey;
  let feeAccount: PublicKey;

  before(async () => {
    mint = await newMint();
    feeAccount = await ata(mint, payer.publicKey);
  });

  it("lets a delegate deposit the payer's own funds into the vault (payer does not sign)", async () => {
    const { vault, vaultToken } = await createVault(
      jobProgram.programId,
      mint,
      feeAccount,
      "escrow-depositfor",
    );
    const owner = Keypair.generate();
    const delegate = Keypair.generate();
    await fundSol(owner.publicKey);
    await fundSol(delegate.publicKey);
    const ownerToken = await fundTokens(mint, owner.publicKey, 5000);
    await initNonce(owner);

    // Owner approves the delegate for up to 3000 (the only time the owner signs).
    await approve(connection, payer, ownerToken, delegate.publicKey, owner, 3000);

    // Delegate deposits 1000 on the owner's behalf; only the delegate signs.
    await escrowProgram.methods
      .depositFor(payload(owner.publicKey, 1000, 1))
      .accounts({
        vault,
        nonceTracker: noncePda(owner.publicKey),
        authority: delegate.publicKey,
        payerToken: ownerToken,
        vaultToken,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([delegate])
      .rpc();

    assert.equal(
      (await escrowProgram.account.vault.fetch(vault)).deposited.toNumber(),
      1000,
    );
    assert.equal(await tokenBalance(vaultToken), 1000n);
    assert.equal(await tokenBalance(ownerToken), 4000n);
  });

  it("rejects a delegated deposit above the approved amount", async () => {
    const { vault, vaultToken } = await createVault(
      jobProgram.programId,
      mint,
      feeAccount,
      "escrow-depositfor-cap",
    );
    const owner = Keypair.generate();
    const delegate = Keypair.generate();
    await fundSol(owner.publicKey);
    await fundSol(delegate.publicKey);
    const ownerToken = await fundTokens(mint, owner.publicKey, 5000);
    await initNonce(owner);
    await approve(connection, payer, ownerToken, delegate.publicKey, owner, 500);

    await expectRevert(
      escrowProgram.methods
        .depositFor(payload(owner.publicKey, 1000, 1))
        .accounts({
          vault,
          nonceTracker: noncePda(owner.publicKey),
          authority: delegate.publicKey,
          payerToken: ownerToken,
          vaultToken,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([delegate])
        .rpc(),
    );
  });

  it("rejects when payload.payer is not the source token account owner", async () => {
    const { vault, vaultToken } = await createVault(
      jobProgram.programId,
      mint,
      feeAccount,
      "escrow-depositfor-owner",
    );
    const owner = Keypair.generate();
    const delegate = Keypair.generate();
    const impostor = Keypair.generate();
    await fundSol(owner.publicKey);
    await fundSol(delegate.publicKey);
    const ownerToken = await fundTokens(mint, owner.publicKey, 5000);
    await initNonce(impostor);
    await approve(connection, payer, ownerToken, delegate.publicKey, owner, 3000);

    // Claim the deposit is "for" the impostor while spending the owner's account.
    await expectRevert(
      escrowProgram.methods
        .depositFor(payload(impostor.publicKey, 1000, 1))
        .accounts({
          vault,
          nonceTracker: noncePda(impostor.publicKey),
          authority: delegate.publicKey,
          payerToken: ownerToken,
          vaultToken,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([delegate])
        .rpc(),
    );
  });
});
