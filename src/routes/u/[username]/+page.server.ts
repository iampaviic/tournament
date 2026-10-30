import { error } from '@sveltejs/kit';
import { getModule } from '#lib/server/modules/registry.ts';
import { listIdentities } from '#lib/server/services/identities.ts';
import { getUserByUsername } from '#lib/server/services/users.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await getUserByUsername(params.username);
	if (!user) error(404, 'User not found');

	const identities = await listIdentities(user.id);
	return {
		profile: {
			username: user.username,
			displayName: user.displayName,
			bio: user.bio,
			avatarUrl: user.avatarUrl,
			createdAt: user.createdAt,
			showResults: user.showResults
		},
		isOwn: locals.user?.id === user.id,
		accounts: identities
			// Dev logins are not real accounts on another platform.
			.filter((identity) => identity.moduleId !== 'dev')
			.map((identity) => ({
				module: getModule(identity.moduleId)?.name ?? identity.moduleId,
				username: identity.username
			}))
	};
};
