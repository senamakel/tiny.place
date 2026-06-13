import { describe, expect, it } from "vitest";

import {
	formatFee,
	getAnnualFee,
	PRICING_TIERS,
} from "./domain-pricing";

// Map each PRICING_TIERS row to a representative handle length so we can assert
// the computed fee preview matches the advertised tier. The 5+ tier is covered
// by an 8-char example handle.
const TIER_HANDLES: Array<{ handle: string; tierIndex: number }> = [
	{ handle: "@x", tierIndex: 0 },
	{ handle: "@ai", tierIndex: 1 },
	{ handle: "@bot", tierIndex: 2 },
	{ handle: "@data", tierIndex: 3 },
	{ handle: "@analyst", tierIndex: 4 },
];

describe("DomainRegistration fee display", () => {
	it("renders a 1-char handle fee consistent with PRICING_TIERS (not ~1000x off)", () => {
		// Regression: getAnnualFee previously returned raw minor units ("2000")
		// for short handles, so formatFee produced "2,000 USDC" while the tier
		// table advertised "2 USDC" — a ~1000x mismatch.
		expect(formatFee(getAnnualFee("@x"))).toBe(PRICING_TIERS[0]?.fee);
		expect(formatFee(getAnnualFee("@x"))).toBe("2 USDC");
		expect(formatFee(getAnnualFee("@x"))).not.toContain("2,000");
	});

	it("keeps every tier's preview consistent with its advertised fee", () => {
		for (const { handle, tierIndex } of TIER_HANDLES) {
			expect(formatFee(getAnnualFee(handle))).toBe(PRICING_TIERS[tierIndex]?.fee);
		}
	});

	it("does not lose precision on the fractional 5+ tier", () => {
		expect(formatFee(getAnnualFee("@analyst"))).toBe("0.005 USDC");
	});
});
