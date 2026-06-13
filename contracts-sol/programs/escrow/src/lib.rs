use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub mod x402;

declare_id!("FNCnjUKR1YbEJwcjWWHJzWxgp2vbSjjHcBZaAshybhLq");

/// Basis-points denominator: `fee_bps` of 250 == 2.50%.
pub const BPS_DENOMINATOR: u64 = 10_000;

#[program]
pub mod escrow {
    use super::*;

    /// Anyone can open an escrow against this singleton program. Escrows are
    /// keyed by a caller-supplied `escrow_id` (PDA `["escrow", escrow_id]`), so
    /// a single deployed program holds an unbounded, id-mapped set of escrows.
    pub fn create(
        ctx: Context<Create>,
        escrow_id: [u8; 32],
        amount: u64,
        fee_bps: u16,
    ) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);
        require!((fee_bps as u64) < BPS_DENOMINATOR, EscrowError::InvalidFee);

        let escrow = &mut ctx.accounts.escrow;
        escrow.escrow_id = escrow_id;
        escrow.client = ctx.accounts.client.key();
        escrow.provider = ctx.accounts.provider.key();
        escrow.admin = ctx.accounts.admin.key();
        escrow.mint = ctx.accounts.mint.key();
        escrow.fee_account = ctx.accounts.fee_account.key();
        escrow.amount = amount;
        escrow.fee_bps = fee_bps;
        escrow.state = EscrowState::Open;
        escrow.bump = ctx.bumps.escrow;

        emit!(Created {
            escrow: escrow.key(),
            escrow_id,
            client: escrow.client,
            provider: escrow.provider,
            amount,
        });
        Ok(())
    }

    pub fn fund(ctx: Context<Fund>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Open, EscrowError::InvalidState);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.client_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.client.to_account_info(),
                },
            ),
            escrow.amount,
        )?;

        emit!(Funded {
            escrow: ctx.accounts.escrow.key(),
            amount: escrow.amount,
        });
        Ok(())
    }

    pub fn mark_delivered(ctx: Context<MarkDelivered>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.state == EscrowState::Open, EscrowError::InvalidState);
        require!(
            ctx.accounts.provider.key() == escrow.provider,
            EscrowError::Unauthorized
        );

        escrow.state = EscrowState::Delivered;

        emit!(Delivered {
            escrow: ctx.accounts.escrow.key(),
        });
        Ok(())
    }

    /// Client accepts delivery; the staked funds are released to the provider,
    /// minus the platform rake which is routed to the configured fee account.
    pub fn approve(ctx: Context<Approve>) -> Result<()> {
        require!(
            ctx.accounts.escrow.state == EscrowState::Delivered,
            EscrowError::InvalidState
        );
        require!(
            ctx.accounts.client.key() == ctx.accounts.escrow.client,
            EscrowError::Unauthorized
        );

        let (net, fee) = split_fee(ctx.accounts.escrow.amount, ctx.accounts.escrow.fee_bps)?;
        release_from_vault(
            &ctx.accounts.escrow,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.provider_token.to_account_info(),
            ctx.accounts.fee_token.to_account_info(),
            net,
            fee,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.state = EscrowState::Resolved;

        emit!(Released {
            escrow: escrow.key(),
            to: escrow.provider,
            amount: net,
            fee,
        });
        Ok(())
    }

    pub fn dispute(ctx: Context<Dispute>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(
            escrow.state == EscrowState::Delivered,
            EscrowError::InvalidState
        );
        let signer = ctx.accounts.signer.key();
        require!(
            signer == escrow.client || signer == escrow.provider,
            EscrowError::Unauthorized
        );

        escrow.state = EscrowState::Disputed;

        emit!(Disputed {
            escrow: ctx.accounts.escrow.key(),
            by: signer,
        });
        Ok(())
    }

    /// Admin/arbitrator resolves a dispute, directing funds to the recipient
    /// (client or provider) minus the platform rake.
    pub fn resolve(ctx: Context<Resolve>) -> Result<()> {
        require!(
            ctx.accounts.escrow.state == EscrowState::Disputed,
            EscrowError::InvalidState
        );
        require!(
            ctx.accounts.admin.key() == ctx.accounts.escrow.admin,
            EscrowError::Unauthorized
        );

        let (net, fee) = split_fee(ctx.accounts.escrow.amount, ctx.accounts.escrow.fee_bps)?;
        release_from_vault(
            &ctx.accounts.escrow,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.recipient_token.to_account_info(),
            ctx.accounts.fee_token.to_account_info(),
            net,
            fee,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.state = EscrowState::Resolved;

        emit!(Resolved {
            escrow: escrow.key(),
            to: ctx.accounts.recipient_token.key(),
            amount: net,
            fee,
        });
        Ok(())
    }

    pub fn init_nonce(ctx: Context<InitNonce>) -> Result<()> {
        x402::handle_init_nonce(ctx)
    }

    pub fn settle(ctx: Context<Settle>, payload: x402::PaymentPayload) -> Result<()> {
        x402::handle_settle(ctx, payload)
    }

    pub fn settle_to_escrow(
        ctx: Context<SettleToEscrow>,
        payload: x402::PaymentPayload,
    ) -> Result<()> {
        x402::handle_settle_to_escrow(ctx, payload)
    }

    /// Client reclaims funds while the escrow is still Open. No rake on refunds.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        require!(
            ctx.accounts.escrow.state == EscrowState::Open,
            EscrowError::InvalidState
        );
        require!(
            ctx.accounts.client.key() == ctx.accounts.escrow.client,
            EscrowError::Unauthorized
        );

        let amount = ctx.accounts.escrow.amount;
        release_from_vault(
            &ctx.accounts.escrow,
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            ctx.accounts.client_token.to_account_info(),
            ctx.accounts.client_token.to_account_info(),
            amount,
            0,
        )?;

        let escrow = &mut ctx.accounts.escrow;
        escrow.state = EscrowState::Refunded;

        emit!(Refunded {
            escrow: escrow.key(),
            amount,
        });
        Ok(())
    }
}

/// Split `amount` into `(net, fee)` where `fee = amount * fee_bps / 10_000`.
fn split_fee(amount: u64, fee_bps: u16) -> Result<(u64, u64)> {
    let fee = (amount as u128)
        .checked_mul(fee_bps as u128)
        .and_then(|value| value.checked_div(BPS_DENOMINATOR as u128))
        .ok_or(EscrowError::MathOverflow)? as u64;
    let net = amount.checked_sub(fee).ok_or(EscrowError::MathOverflow)?;
    Ok((net, fee))
}

/// Move `net` to `recipient` and `fee` to `fee_recipient`, signed by the escrow PDA.
fn release_from_vault<'info>(
    escrow: &Account<'info, EscrowAccount>,
    token_program: AccountInfo<'info>,
    vault: AccountInfo<'info>,
    recipient: AccountInfo<'info>,
    fee_recipient: AccountInfo<'info>,
    net: u64,
    fee: u64,
) -> Result<()> {
    let seeds: &[&[u8]] = &[b"escrow", escrow.escrow_id.as_ref(), &[escrow.bump]];
    let signer_seeds = &[seeds];

    token::transfer(
        CpiContext::new_with_signer(
            token_program.clone(),
            Transfer {
                from: vault.clone(),
                to: recipient,
                authority: escrow.to_account_info(),
            },
            signer_seeds,
        ),
        net,
    )?;

    if fee > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                token_program,
                Transfer {
                    from: vault,
                    to: fee_recipient,
                    authority: escrow.to_account_info(),
                },
                signer_seeds,
            ),
            fee,
        )?;
    }

    Ok(())
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum EscrowState {
    Open,
    Delivered,
    Resolved,
    Disputed,
    Refunded,
}

#[account]
pub struct EscrowAccount {
    pub escrow_id: [u8; 32],
    pub client: Pubkey,
    pub provider: Pubkey,
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub fee_account: Pubkey,
    pub amount: u64,
    pub fee_bps: u16,
    pub state: EscrowState,
    pub bump: u8,
}

impl EscrowAccount {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 32 + 32 + 32 + 8 + 2 + 1 + 1;
}

// --- Contexts ---

#[derive(Accounts)]
#[instruction(escrow_id: [u8; 32])]
pub struct Create<'info> {
    #[account(
        init,
        payer = creator,
        space = EscrowAccount::SIZE,
        seeds = [b"escrow", escrow_id.as_ref()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    /// The fee-payer opening the escrow; need not be a party to it.
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: client pubkey, not signing
    pub client: AccountInfo<'info>,
    /// CHECK: provider pubkey, not signing
    pub provider: AccountInfo<'info>,
    /// CHECK: admin pubkey, not signing
    pub admin: AccountInfo<'info>,
    /// CHECK: token mint
    pub mint: AccountInfo<'info>,
    /// CHECK: token account that receives the platform rake on release
    pub fee_account: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Fund<'info> {
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub client: Signer<'info>,
    #[account(mut, constraint = client_token.owner == client.key())]
    pub client_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MarkDelivered<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    pub provider: Signer<'info>,
}

#[derive(Accounts)]
pub struct Approve<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    pub client: Signer<'info>,
    #[account(mut)]
    pub provider_token: Account<'info, TokenAccount>,
    #[account(mut, constraint = fee_token.key() == escrow.fee_account @ EscrowError::InvalidFeeAccount)]
    pub fee_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Dispute<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct Resolve<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub recipient_token: Account<'info, TokenAccount>,
    #[account(mut, constraint = fee_token.key() == escrow.fee_account @ EscrowError::InvalidFeeAccount)]
    pub fee_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    pub client: Signer<'info>,
    #[account(mut, constraint = client_token.owner == client.key())]
    pub client_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// --- x402 contexts (handlers live in `x402.rs`) ---

#[derive(Accounts)]
pub struct InitNonce<'info> {
    #[account(
        init,
        payer = owner,
        space = x402::NonceTracker::SIZE,
        seeds = [b"nonce", owner.key().as_ref()],
        bump
    )]
    pub nonce_tracker: Account<'info, x402::NonceTracker>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(payload: x402::PaymentPayload)]
pub struct Settle<'info> {
    #[account(
        init,
        payer = payer,
        space = x402::PaymentRecord::SIZE,
        seeds = [b"payment", payload.payer.as_ref(), &payload.nonce.to_le_bytes()],
        bump
    )]
    pub payment_record: Account<'info, x402::PaymentRecord>,
    #[account(
        mut,
        seeds = [b"nonce", payload.payer.as_ref()],
        bump = nonce_tracker.bump,
    )]
    pub nonce_tracker: Account<'info, x402::NonceTracker>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, constraint = payer_token.owner == payer.key())]
    pub payer_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub payee_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(payload: x402::PaymentPayload)]
pub struct SettleToEscrow<'info> {
    #[account(
        init,
        payer = payer,
        space = x402::PaymentRecord::SIZE,
        seeds = [b"payment", payload.payer.as_ref(), &payload.nonce.to_le_bytes()],
        bump
    )]
    pub payment_record: Account<'info, x402::PaymentRecord>,
    #[account(
        mut,
        seeds = [b"nonce", payload.payer.as_ref()],
        bump = nonce_tracker.bump,
    )]
    pub nonce_tracker: Account<'info, x402::NonceTracker>,
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut, constraint = payer_token.owner == payer.key())]
    pub payer_token: Account<'info, TokenAccount>,
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// --- Events ---

#[event]
pub struct Created {
    pub escrow: Pubkey,
    pub escrow_id: [u8; 32],
    pub client: Pubkey,
    pub provider: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Funded {
    pub escrow: Pubkey,
    pub amount: u64,
}

#[event]
pub struct Delivered {
    pub escrow: Pubkey,
}

#[event]
pub struct Released {
    pub escrow: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub fee: u64,
}

#[event]
pub struct Disputed {
    pub escrow: Pubkey,
    pub by: Pubkey,
}

#[event]
pub struct Resolved {
    pub escrow: Pubkey,
    pub to: Pubkey,
    pub amount: u64,
    pub fee: u64,
}

#[event]
pub struct Refunded {
    pub escrow: Pubkey,
    pub amount: u64,
}

// --- Errors ---

#[error_code]
pub enum EscrowError {
    #[msg("Invalid escrow state for this operation")]
    InvalidState,
    #[msg("Unauthorized caller")]
    Unauthorized,
    #[msg("Payment has expired")]
    Expired,
    #[msg("Nonce already used")]
    NonceUsed,
    #[msg("Amount mismatch")]
    InvalidAmount,
    #[msg("Fee basis points must be below 10000")]
    InvalidFee,
    #[msg("Fee token account does not match the escrow fee account")]
    InvalidFeeAccount,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
