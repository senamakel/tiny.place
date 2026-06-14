import { assert } from "chai";
import {
  escrowProgram,
  lotteryProgram,
  payer,
  newMint,
  ata,
  fundTokens,
  fundSol,
  tokenBalance,
  createVault,
  initNonce,
  noncePda,
  roundPda,
  ticketPda,
  vaultAuthorityPda,
  payload,
  id32,
  expectRevert,
  BN,
  Keypair,
  PublicKey,
  SystemProgram,
  TOKEN_PROGRAM_ID,
} from "./setup";

const TICKET_PRICE = 1000; // base units per ticket (mirrors 1 USDC = 1 ticket)
const FEE_BPS = 500; // 5% rake

describe("settlement_game_lottery", () => {
  let mint: PublicKey;
  let feeAccount: PublicKey;
  const drawer = Keypair.generate();
  const vaultAuthority = () => vaultAuthorityPda(lotteryProgram.programId);

  before(async () => {
    mint = await newMint();
    feeAccount = await ata(mint, payer.publicKey);
    await fundSol(drawer.publicKey);
  });

  async function newRound(label: string) {
    const { vault, vaultToken } = await createVault(
      lotteryProgram.programId,
      mint,
      feeAccount,
      label,
    );
    const roundId = id32(label);
    const round = roundPda(roundId);
    await lotteryProgram.methods
      .createRound(roundId, drawer.publicKey, new BN(TICKET_PRICE), FEE_BPS)
      .accounts({
        round,
        creator: payer.publicKey,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .signers([])
      .rpc();
    return { vault, vaultToken, round, roundId };
  }

  async function buy(
    round: PublicKey,
    vault: PublicKey,
    vaultToken: PublicKey,
    player: Keypair,
    amount: number,
    nonce: number,
    fundFirst = true,
  ) {
    if (fundFirst) {
      await fundSol(player.publicKey);
      await fundTokens(mint, player.publicKey, amount);
      await initNonce(player);
    }
    const playerToken = await ata(mint, player.publicKey);
    await lotteryProgram.methods
      .buy(payload(player.publicKey, amount, nonce))
      .accounts({
        round,
        ticketEntry: ticketPda(round, player.publicKey),
        vault,
        nonceTracker: noncePda(player.publicKey),
        player: player.publicKey,
        playerToken,
        vaultToken,
        tokenProgram: TOKEN_PROGRAM_ID,
        escrowProgram: escrowProgram.programId,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();
  }

  it("buys accumulate tickets and the drawer pays many winners on the curve", async () => {
    const { vault, vaultToken, round } = await newRound("lottery-happy");
    const p1 = Keypair.generate();
    const p2 = Keypair.generate();

    // p1 buys twice (2 then 1 ticket) -> entry accumulates to 3 tickets, counted
    // as a single participant. p2 buys 1 ticket.
    await fundSol(p1.publicKey);
    await fundTokens(mint, p1.publicKey, 3 * TICKET_PRICE);
    await initNonce(p1);
    await buy(round, vault, vaultToken, p1, 2 * TICKET_PRICE, 1, false);
    await buy(round, vault, vaultToken, p1, 1 * TICKET_PRICE, 2, false);
    await buy(round, vault, vaultToken, p2, 1 * TICKET_PRICE, 1);

    const r = await lotteryProgram.account.round.fetch(round);
    assert.equal(r.ticketCount.toNumber(), 4);
    assert.equal(r.participantCount, 2);
    assert.equal(await tokenBalance(vaultToken), BigInt(4 * TICKET_PRICE));

    // Off-chain the backend computes the geometric split; here we settle two
    // winners with those amounts. pot=4000, rake=200, pool=3800,
    // payout1=2534 (incl. dust), payout2=1266. rake is taken as fee on the first.
    const pot = 4 * TICKET_PRICE;
    const rake = Math.floor((pot * FEE_BPS) / 10000); // 200
    const payout1 = 2534;
    const payout2 = 1266;
    assert.equal(payout1 + payout2 + rake, pot, "conservation");

    const w1 = await ata(mint, p1.publicKey);
    const w2 = await ata(mint, p2.publicKey);
    const feeBefore = await tokenBalance(feeAccount);
    const w1Before = await tokenBalance(w1);
    const w2Before = await tokenBalance(w2);

    await lotteryProgram.methods
      .beginDraw()
      .accounts({ round, drawer: drawer.publicKey })
      .signers([drawer])
      .rpc();

    // Winner 1 (rank 1) also carries the rake as the fee.
    await lotteryProgram.methods
      .settleWinner(new BN(payout1), new BN(rake))
      .accounts({
        round,
        drawer: drawer.publicKey,
        vault,
        vaultAuthority: vaultAuthority(),
        vaultToken,
        winnerToken: w1,
        feeToken: feeAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        escrowProgram: escrowProgram.programId,
      })
      .signers([drawer])
      .rpc();

    // Winner 2 (rank 2), no further fee.
    await lotteryProgram.methods
      .settleWinner(new BN(payout2), new BN(0))
      .accounts({
        round,
        drawer: drawer.publicKey,
        vault,
        vaultAuthority: vaultAuthority(),
        vaultToken,
        winnerToken: w2,
        feeToken: feeAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        escrowProgram: escrowProgram.programId,
      })
      .signers([drawer])
      .rpc();

    await lotteryProgram.methods
      .finalize()
      .accounts({ round, drawer: drawer.publicKey })
      .signers([drawer])
      .rpc();

    assert.equal((await tokenBalance(w1)) - w1Before, BigInt(payout1));
    assert.equal((await tokenBalance(w2)) - w2Before, BigInt(payout2));
    assert.equal((await tokenBalance(feeAccount)) - feeBefore, BigInt(rake));
    assert.equal(await tokenBalance(vaultToken), BigInt(0), "pot fully disbursed");
    assert.deepEqual((await lotteryProgram.account.round.fetch(round)).state, {
      settled: {},
    });
  });

  it("cancel + claim_refund returns each depositor's stake", async () => {
    const { vault, vaultToken, round } = await newRound("lottery-cancel");
    const p1 = Keypair.generate();
    const p2 = Keypair.generate();
    await buy(round, vault, vaultToken, p1, 2 * TICKET_PRICE, 1);
    await buy(round, vault, vaultToken, p2, 1 * TICKET_PRICE, 1);

    await lotteryProgram.methods
      .cancel()
      .accounts({ round, drawer: drawer.publicKey })
      .signers([drawer])
      .rpc();

    for (const [p, amount] of [
      [p1, 2 * TICKET_PRICE],
      [p2, 1 * TICKET_PRICE],
    ] as const) {
      const token = await ata(mint, p.publicKey);
      const before = await tokenBalance(token);
      await lotteryProgram.methods
        .claimRefund()
        .accounts({
          round,
          ticketEntry: ticketPda(round, p.publicKey),
          buyer: p.publicKey,
          vault,
          vaultAuthority: vaultAuthority(),
          vaultToken,
          buyerToken: token,
          feeToken: feeAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          escrowProgram: escrowProgram.programId,
        })
        .signers([p])
        .rpc();
      assert.equal((await tokenBalance(token)) - before, BigInt(amount));
    }
  });

  it("rejects partial-ticket buys and non-drawer settle", async () => {
    const { vault, vaultToken, round } = await newRound("lottery-guards");
    const p1 = Keypair.generate();
    await buy(round, vault, vaultToken, p1, 2 * TICKET_PRICE, 1);

    // A deposit that is not a whole multiple of the ticket price is rejected.
    const p2 = Keypair.generate();
    await fundSol(p2.publicKey);
    await fundTokens(mint, p2.publicKey, 5 * TICKET_PRICE);
    await initNonce(p2);
    await expectRevert(
      buy(round, vault, vaultToken, p2, TICKET_PRICE + 1, 1, false),
      "partial ticket buy",
    );

    // A non-drawer cannot begin the draw.
    const stranger = Keypair.generate();
    await fundSol(stranger.publicKey);
    await expectRevert(
      lotteryProgram.methods
        .beginDraw()
        .accounts({ round, drawer: stranger.publicKey })
        .signers([stranger])
        .rpc(),
      "non-drawer begin_draw",
    );
  });

  // Regression for the vault-theft class (mirrors the poker test): a pot vault is
  // bound 1:1 to one round at creation (escrow stores vault.owner = the round
  // PDA). A third party must NOT register a competing round over an already-funded
  // pot vault to drain it — create_round reverts with VaultNotOwned.
  it("rejects a competing round registered against another round's pot vault", async () => {
    const { vault, vaultToken, round } = await newRound("lottery-victim-vault");
    const p1 = Keypair.generate();
    await buy(round, vault, vaultToken, p1, TICKET_PRICE, 1);

    const attacker = Keypair.generate();
    await fundSol(attacker.publicKey);
    const attackerRoundId = id32("lottery-attacker-steal");
    const attackerRound = roundPda(attackerRoundId);
    await expectRevert(
      lotteryProgram.methods
        .createRound(attackerRoundId, attacker.publicKey, new BN(TICKET_PRICE), FEE_BPS)
        .accounts({
          round: attackerRound,
          creator: attacker.publicKey,
          vault,
          systemProgram: SystemProgram.programId,
        })
        .signers([attacker])
        .rpc(),
      "competing round over a funded pot vault",
    );
  });
});
