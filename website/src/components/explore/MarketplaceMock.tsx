import { useState } from "react";

import type { FunctionComponent } from "@src/common/types";

type Product = {
	name: string;
	seller: string;
	price: number;
	category: "Services" | "Data" | "Tools";
	rating: number;
	description: string;
};

const products: Array<Product> = [
	{
		name: "Market Analysis Report",
		seller: "@meridian",
		price: 25,
		category: "Data",
		rating: 4.8,
		description: "Weekly deep-dive into on-chain metrics and market trends.",
	},
	{
		name: "Smart Contract Audit",
		seller: "@cipher",
		price: 150,
		category: "Services",
		rating: 4.9,
		description:
			"Comprehensive security audit for Solidity contracts up to 500 LOC.",
	},
	{
		name: "Data Pipeline Setup",
		seller: "@flux",
		price: 80,
		category: "Tools",
		rating: 4.6,
		description:
			"Custom real-time data streaming pipeline with webhook integration.",
	},
	{
		name: "NLP Model Fine-tuning",
		seller: "@nova",
		price: 120,
		category: "Services",
		rating: 4.5,
		description: "Fine-tune language models on your domain-specific dataset.",
	},
	{
		name: "Portfolio Rebalancing",
		seller: "@drift",
		price: 35,
		category: "Tools",
		rating: 4.4,
		description:
			"Automated portfolio rebalancing strategy based on risk parameters.",
	},
	{
		name: "Security Scan",
		seller: "@cipher",
		price: 45,
		category: "Services",
		rating: 4.7,
		description:
			"Automated vulnerability scanning for deployed smart contracts.",
	},
];

const categories = ["All", "Services", "Data", "Tools"] as const;

type MarketplaceMockProperties = {
	isDark: boolean;
};

export const MarketplaceMock = ({
	isDark,
}: MarketplaceMockProperties): FunctionComponent => {
	const [activeCategory, setActiveCategory] =
		useState<(typeof categories)[number]>("All");

	const filtered =
		activeCategory === "All"
			? products
			: products.filter((product) => product.category === activeCategory);

	return (
		<div className="flex flex-col gap-3">
			<div className="flex gap-1">
				{categories.map((category) => (
					<button
						key={category}
						type="button"
						className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
							activeCategory === category
								? isDark
									? "bg-neutral-700 text-white"
									: "bg-neutral-300 text-black"
								: isDark
									? "text-neutral-500 hover:text-neutral-300"
									: "text-neutral-400 hover:text-neutral-600"
						}`}
						onClick={(): void => {
							setActiveCategory(category);
						}}
					>
						{category}
					</button>
				))}
			</div>
			<div className="grid grid-cols-2 gap-3">
				{filtered.map((product) => (
					<div
						key={product.name}
						className={`rounded-lg border p-3 ${
							isDark
								? "border-neutral-800 bg-neutral-950"
								: "border-neutral-200 bg-neutral-50"
						}`}
					>
						<div className="flex items-start justify-between">
							<span
								className={`text-sm font-medium ${isDark ? "text-white" : "text-black"}`}
							>
								{product.name}
							</span>
							<span
								className={`rounded-full px-1.5 py-0.5 text-xs ${
									isDark
										? "bg-neutral-800 text-neutral-400"
										: "bg-neutral-200 text-neutral-500"
								}`}
							>
								{product.category}
							</span>
						</div>
						<p
							className={`mt-1 text-xs ${isDark ? "text-neutral-500" : "text-neutral-400"}`}
						>
							{product.description}
						</p>
						<div className="mt-2 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span
									className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"}`}
								>
									{product.seller}
								</span>
								<span className="text-xs text-amber-500">
									★ {product.rating}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<span
									className={`text-xs font-medium ${isDark ? "text-white" : "text-black"}`}
								>
									{product.price} USDC
								</span>
								<button
									className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
									type="button"
									onClick={(): void => {}}
								>
									Purchase
								</button>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
