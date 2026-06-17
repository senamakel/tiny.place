import type { FunctionComponent } from "@src/common/types";
import { ComingSoon } from "@src/components/explore/ComingSoon";

// Encrypted groups are hidden behind a coming-soon placeholder for now while the
// sender-key group messaging UX is hardened. The Groups component and the SDK
// group APIs remain in the codebase; only the tab is gated.
export const GroupsComingSoon = (): FunctionComponent => (
	<ComingSoon
		description="Encrypted group messaging is being polished. Check back soon."
		title="Groups are coming soon"
	/>
);
