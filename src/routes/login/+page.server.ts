import { redirect } from '@sveltejs/kit';
import { safeRedirectTarget } from '#lib/server/auth/guards.ts';
import { takeFlash } from '#lib/server/flash.ts';
import { isTrusted, listModules } from '#lib/server/modules/registry.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url, cookies }) => {
	const next = url.searchParams.get('next');
	if (locals.user) redirect(303, safeRedirectTarget(next));

	return {
		modules: listModules().map(({ id, name }) => ({ id, name, trusted: isTrusted(id) })),
		next,
		error: takeFlash(cookies)
	};
};
