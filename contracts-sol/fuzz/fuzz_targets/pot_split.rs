#![no_main]
//! Coverage-guided fuzzing of poker pot conservation.
//! Run: `cargo +nightly fuzz run pot_split` from contracts-sol/.
use libfuzzer_sys::fuzz_target;
use settlement_game_poker::math::pot_split;

fuzz_target!(|data: (u64, u16)| {
    let (pot, fee_bps) = data;
    // fee_bps is validated < 10_000 at game creation.
    if fee_bps as u64 >= settlement_game_poker::math::BPS_DENOMINATOR {
        return;
    }
    if let Some((payout, fee)) = pot_split(pot, fee_bps) {
        // P1 conservation, P2 fee bound.
        assert_eq!(payout.checked_add(fee), Some(pot));
        assert!(fee <= pot);
    }
});
