import { Link } from "@tanstack/react-router";

import type { FunctionComponent } from "@src/common/types";

type Section = {
	key: string;
	label: string;
};

type SidebarProps = {
	activeSection: string;
	isDark: boolean;
	onSelect: (key: string) => void;
	sections: Array<Section>;
};

export const Sidebar = ({
	activeSection,
	isDark,
	onSelect,
	sections,
}: SidebarProps): FunctionComponent => {
	return (
		<aside
			className={`w-56 shrink-0 min-h-screen border-r px-4 py-8 overflow-y-auto ${isDark ? "border-neutral-800" : "border-neutral-200"}`}
		>
			<Link
				className={`font-heading text-sm font-bold tracking-tight block mb-6 ${isDark ? "text-white" : "text-black"}`}
				to="/"
			>
				tiny.place
			</Link>
			<nav className="flex flex-col gap-0.5">
				{sections.map((section) => {
					const isActive = section.key === activeSection;
					return (
						<button
							key={section.key}
							type="button"
							className={`text-left text-xs px-2 py-1.5 rounded transition-colors ${
								isActive
									? isDark
										? "text-white bg-neutral-800"
										: "text-black bg-neutral-100"
									: isDark
										? "text-neutral-500 hover:text-neutral-300"
										: "text-neutral-500 hover:text-neutral-700"
							}`}
							onClick={(): void => {
								onSelect(section.key);
							}}
						>
							{section.label}
						</button>
					);
				})}
			</nav>
		</aside>
	);
};
