import { error, type RequestEvent } from '@sveltejs/kit';
import type { OrgRole } from '#lib/server/db/schema.ts';
import {
	getMemberRole,
	getOrganizationBySlug,
	hasRole
} from '#lib/server/services/organizations.ts';
import { m } from '#lib/paraglide/messages.js';
import { requireTrusted } from './guards';

/**
 * Guards an organization's admin pages: requires a trusted session and at least `required` role.
 * Call it in every load function and form action (actions don't run layout loads).
 */
export async function requireOrgRole(
	event: Pick<RequestEvent, 'locals' | 'url'>,
	slug: string,
	required: OrgRole = 'admin'
) {
	const user = requireTrusted(event);
	const org = await getOrganizationBySlug(slug);
	if (!org) error(404, m.error_org_not_found());

	const role = await getMemberRole(org.id, user.id);
	if (!role) error(403, m.error_not_member());
	if (!hasRole(role, required)) error(403, m.error_owner_only());
	return { user, org, role };
}
