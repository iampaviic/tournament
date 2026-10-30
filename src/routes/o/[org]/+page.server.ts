import { error } from '@sveltejs/kit';
import { getMemberRole, getOrganizationBySlug } from '#lib/server/services/organizations.ts';
import { listOrgTournaments } from '#lib/server/services/tournaments.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const org = await getOrganizationBySlug(params.org);
	if (!org) error(404, 'Organization not found');

	const tournaments = (await listOrgTournaments(org.id)).map((t) => ({ ...t, orgSlug: org.slug }));
	return {
		org: { slug: org.slug, name: org.name, description: org.description },
		isMember: locals.user ? Boolean(await getMemberRole(org.id, locals.user.id)) : false,
		current: tournaments.filter((t) => t.status !== 'completed').reverse(),
		archive: tournaments.filter((t) => t.status === 'completed')
	};
};
