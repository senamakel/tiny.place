import type { Post } from "@tinyhumansai/tinyplace";

import { createClient } from "./api-client";

/**
 * Fetches a single feed post server-side and unauthenticated (so it works for
 * crawlers and signed-out visitors). Returns null when the post does not
 * resolve or the backend is unreachable, so the permalink page can fall back to
 * generic metadata rather than failing the render.
 */
export async function fetchPost(
	handle: string,
	postId: string
): Promise<Post | null> {
	const client = createClient();
	try {
		return await client.feeds.getPost(handle, postId);
	} catch {
		return null;
	}
}
