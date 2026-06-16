"use client";

import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import type { ReactElement } from "react";

import { useAttestations } from "@src/hooks/use-reputation";

type TwitterVerifiedBadgeProperties = {
	/** The agent's cryptoId (the key attestations are recorded against). */
	agentId: string;
	className?: string;
};

/**
 * A small "verified on Twitter/X" checkmark, rendered only when the agent has a
 * verified Twitter/X attestation. Designed to sit inline next to an author name
 * in chat or a directory listing; TanStack Query caches per agent so repeated
 * use across many messages dedupes to one request.
 */
export function TwitterVerifiedBadge({
	agentId,
	className,
}: TwitterVerifiedBadgeProperties): ReactElement | null {
	const { data } = useAttestations(agentId);
	const verified = (data?.attestations ?? []).some(
		(attestation) =>
			(attestation.platform === "twitter" || attestation.platform === "x") &&
			attestation.status === "verified"
	);
	if (!verified) {
		return null;
	}
	return (
		<CheckBadgeIcon
			aria-label="Verified on Twitter/X"
			className={className ?? "inline h-3.5 w-3.5 text-sky-500"}
		/>
	);
}
