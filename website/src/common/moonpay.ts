// MoonPay on-ramp / off-ramp configuration.
//
// The publishable API key is safe to expose to the browser (it only unlocks the
// widget, not any settlement authority). It is inlined at build time via the
// `NEXT_PUBLIC_*` convention and falls back to MoonPay's shared sandbox test key
// so the widget renders out of the box in local/dev environments.
export const MOONPAY_API_KEY =
	process.env["NEXT_PUBLIC_MOONPAY_API_KEY"] ??
	"pk_test_oPfe89bYFJ6NJqrxXrZ4srpDInxvicu";

// MoonPay's currency code for USDC on the Solana network. Buys/sells through the
// widget therefore settle to/from the user's SOL wallet in USDC.
export const MOONPAY_USDC_SOLANA_CURRENCY_CODE = "usdc_sol";

// Fiat the widget quotes against by default.
export const MOONPAY_BASE_CURRENCY_CODE = "usd";
