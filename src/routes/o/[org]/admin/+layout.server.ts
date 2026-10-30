import { requireOrgRole } from '#lib/server/auth/org.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const { org, role } = await requireOrgRole(event, event.params.org);
	return { org: { slug: org.slug, name: org.name }, role };
};
