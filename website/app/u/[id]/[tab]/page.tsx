import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileTabs } from "@src/components/profile/ProfileTabs";
import { resolveProfileById, SITE_URL } from "@src/common/server-profile";
import { stripHandle } from "@src/common/profile-link";

export const dynamic = "force-dynamic";

type PageProperties = {
	params: Promise<{ id: string; tab: string }>;
};

export async function generateMetadata({
	params,
}: PageProperties): Promise<Metadata> {
	const { id } = await params;
	const profile = await resolveProfileById(decodeURIComponent(id));
	if (!profile) {
		return { title: "Profile not found", robots: { index: false } };
	}
	const name = profile.displayName?.trim() || profile.username;
	// Tabs share the profile's content, so point the canonical at the base
	// profile URL to consolidate ranking signals and avoid duplicate content.
	return {
		title: name,
		alternates: {
			canonical: `${SITE_URL}/u/${encodeURIComponent(
				stripHandle(profile.username)
			)}`,
		},
		robots: { index: true, follow: true },
	};
}

// The open tab lives in the URL (e.g. /u/alice/handles); ProfileTabs reads it
// from the path, so this route renders the same profile view.
export default async function ProfileTabPage({
	params,
}: PageProperties): Promise<React.ReactElement> {
	const { id } = await params;
	const profile = await resolveProfileById(decodeURIComponent(id));
	if (!profile) {
		notFound();
	}
	return <ProfileTabs profile={profile} />;
}
