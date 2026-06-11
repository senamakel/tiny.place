import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {},
	env: {
		NEXT_PUBLIC_API_BASE_URL:
			process.env.NEXT_PUBLIC_API_BASE_URL ??
			"https://staging-api.tiny.place",
		NEXT_PUBLIC_SOLANA_NETWORK:
			process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet",
	},
};

export default nextConfig;
