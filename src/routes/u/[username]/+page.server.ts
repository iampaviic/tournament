import { error } from '@sveltejs/kit';
import { getProfile } from '#lib/server/services/profiles.ts';
import { m } from '#lib/paraglide/messages.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const profile = await getProfile(params.username, locals.user?.id ?? null);
	if (!profile) error(404, m.error_user_not_found());
	return profile;
};
