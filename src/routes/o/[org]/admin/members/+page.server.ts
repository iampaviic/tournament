import { fail } from '@sveltejs/kit';
import { requireOrgRole } from '#lib/server/auth/org.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import {
	addMember,
	listMembers,
	removeMember,
	roleSchema,
	setMemberRole
} from '#lib/server/services/organizations.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { org, user } = await requireOrgRole(event, event.params.org);
	return { members: await listMembers(org.id), currentUserId: user.id };
};

/** Runs a member change as an owner, turning rule violations into form errors. */
async function asOwner(
	event: Parameters<Actions[string]>[0],
	change: (orgId: string, form: FormData) => Promise<string | void>
) {
	const { org } = await requireOrgRole(event, event.params.org, 'owner');
	const form = await event.request.formData();
	try {
		const message = await change(org.id, form);
		return message ? { message } : undefined;
	} catch (e) {
		if (e instanceof ServiceError) return fail(400, { error: e.message });
		throw e;
	}
}

function parseRole(form: FormData) {
	const role = roleSchema.safeParse(form.get('role'));
	if (!role.success) throw new ServiceError('Choose a valid role.');
	return role.data;
}

export const actions: Actions = {
	add: (event) =>
		asOwner(event, async (orgId, form) => {
			const username = String(form.get('username') ?? '').trim();
			await addMember(orgId, username, parseRole(form));
			return m.members_added({ username });
		}),
	role: (event) =>
		asOwner(event, (orgId, form) =>
			setMemberRole(orgId, String(form.get('userId')), parseRole(form))
		),
	remove: (event) =>
		asOwner(event, (orgId, form) => removeMember(orgId, String(form.get('userId'))))
};
