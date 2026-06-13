use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};

use crate::{EscrowError, EscrowState, InitNonce, Settle, SettleToEscrow};

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PaymentPayload {
    pub amount: u64,
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub nonce: u64,
    pub expiry: i64,
}

#[account]
pub struct PaymentRecord {
    pub payment_id: [u8; 32],
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64,
    pub escrow: Option<Pubkey>,
    pub settled: bool,
    pub bump: u8,
}

impl PaymentRecord {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 8 + (1 + 32) + 1 + 1;
}

#[account]
pub struct NonceTracker {
    pub owner: Pubkey,
    pub last_nonce: u64,
    pub bump: u8,
}

impl NonceTracker {
    pub const SIZE: usize = 8 + 32 + 8 + 1;
}

pub fn handle_init_nonce(ctx: Context<InitNonce>) -> Result<()> {
    let tracker = &mut ctx.accounts.nonce_tracker;
    tracker.owner = ctx.accounts.owner.key();
    tracker.last_nonce = 0;
    tracker.bump = ctx.bumps.nonce_tracker;
    Ok(())
}

pub fn handle_settle(ctx: Context<Settle>, payload: PaymentPayload) -> Result<()> {
    let clock = Clock::get()?;
    require!(clock.unix_timestamp <= payload.expiry, EscrowError::Expired);

    let tracker = &mut ctx.accounts.nonce_tracker;
    require!(payload.nonce > tracker.last_nonce, EscrowError::NonceUsed);
    tracker.last_nonce = payload.nonce;

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer_token.to_account_info(),
                to: ctx.accounts.payee_token.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        ),
        payload.amount,
    )?;

    let record = &mut ctx.accounts.payment_record;
    record.payment_id = payment_id(&payload);
    record.payer = payload.payer;
    record.payee = payload.payee;
    record.amount = payload.amount;
    record.escrow = None;
    record.settled = true;
    record.bump = ctx.bumps.payment_record;

    emit!(PaymentSettled {
        payment_id: record.payment_id,
        payer: payload.payer,
        payee: payload.payee,
        amount: payload.amount,
    });
    Ok(())
}

pub fn handle_settle_to_escrow(
    ctx: Context<SettleToEscrow>,
    payload: PaymentPayload,
) -> Result<()> {
    let clock = Clock::get()?;
    require!(clock.unix_timestamp <= payload.expiry, EscrowError::Expired);

    let tracker = &mut ctx.accounts.nonce_tracker;
    require!(payload.nonce > tracker.last_nonce, EscrowError::NonceUsed);
    tracker.last_nonce = payload.nonce;

    let escrow = &ctx.accounts.escrow;
    require!(escrow.client == payload.payer, EscrowError::Unauthorized);
    require!(escrow.amount == payload.amount, EscrowError::InvalidAmount);
    require!(escrow.state == EscrowState::Open, EscrowError::InvalidState);

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.payer_token.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.payer.to_account_info(),
            },
        ),
        payload.amount,
    )?;

    let record = &mut ctx.accounts.payment_record;
    record.payment_id = payment_id(&payload);
    record.payer = payload.payer;
    record.payee = payload.payee;
    record.amount = payload.amount;
    record.escrow = Some(ctx.accounts.escrow.key());
    record.settled = true;
    record.bump = ctx.bumps.payment_record;

    emit!(PaymentEscrowed {
        payment_id: record.payment_id,
        escrow: ctx.accounts.escrow.key(),
        amount: payload.amount,
    });
    Ok(())
}

pub fn payment_id(payload: &PaymentPayload) -> [u8; 32] {
    let mut data = Vec::new();
    data.extend_from_slice(&payload.amount.to_le_bytes());
    data.extend_from_slice(payload.payer.as_ref());
    data.extend_from_slice(payload.payee.as_ref());
    data.extend_from_slice(&payload.nonce.to_le_bytes());
    data.extend_from_slice(&payload.expiry.to_le_bytes());
    anchor_lang::solana_program::keccak::hash(&data).to_bytes()
}

#[event]
pub struct PaymentSettled {
    pub payment_id: [u8; 32],
    pub payer: Pubkey,
    pub payee: Pubkey,
    pub amount: u64,
}

#[event]
pub struct PaymentEscrowed {
    pub payment_id: [u8; 32],
    pub escrow: Pubkey,
    pub amount: u64,
}
