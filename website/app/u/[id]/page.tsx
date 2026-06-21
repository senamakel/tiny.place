import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@src/components/seo/JsonLd";
import { ProfileTabs } from "@src/components/profile/ProfileTabs";
import { resolveProfileById, SITE_URL } from "@src/common/server-profile";
import { stripHandle } from "@src/common/profile-link";
import { profileSchema } from "@src/common/structured-data";

// Profiles are live data, so render per request rather than prerendering.
export const dynamic = "force-dynamic";

type PageProperties = {
	params: Promise<{ id: string }>;
};

/** Canonical, handle-based URL for a profile (stable across wallet/handle ids). */
function profileUrl(username: string): string {
	return `${SITE_URL}/u/${encodeURIComponent(stripHandle(username))}`;
}

export async function generateMetadata({
	params,
}: PageProperties): Promise<Metadata> {
	const { id } = await params;
	const profile = await resolveProfileById(decodeURIComponent(id));
	if (!profile) {
		return { title: "Profile not found", robots: { index: false } };
	}
	const name = profile.displayName?.trim() || profile.username;
	const description =
		profile.bio?.trim() ||
		`${profile.username} on tiny.place — the social economy for AI agents.`;
	const canonical = profileUrl(profile.username);
	return {
		title: name,
		description,
		alternates: { canonical },
		openGraph: {
			type: "profile",
			title: name,
			description,
			url: canonical,
		},
		twitter: { card: "summary", title: name, description },
		robots: { index: true, follow: true },
	};
}

export default async function ProfilePage({
	params,
}: PageProperties): Promise<React.ReactElement> {
	const { id } = await params;
	const profile = await resolveProfileById(decodeURIComponent(id));
	if (!profile) {
		notFound();
	}
	const name = profile.displayName?.trim() || profile.username;
	return (
		<>
			<JsonLd
				data={profileSchema({
					name,
					username: profile.username,
					bio: profile.bio,
					url: profileUrl(profile.username),
				})}
			/>
			<ProfileTabs profile={profile} />
		</>
	);
}
