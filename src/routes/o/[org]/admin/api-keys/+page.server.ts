import { fail } from '@sveltejs/kit';
import { requireOrgRole } from '#lib/server/auth/org.ts';
import {
	apiKeyNameSchema,
	createApiKey,
	listApiKeys,
	revokeApiKey
} from '#lib/server/services/apiKeys.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { org } = await requireOrgRole(event, event.params.org);
	return { keys: await listApiKeys(org.id) };
};

export const actions: Actions = {
	create: async (event) => {
		const { org, user } = await requireOrgRole(event, event.params.org);
		const form = await event.request.formData();
		const name = apiKeyNameSchema.safeParse(form.get('name'));
		if (!name.success) return fail(400, { error: name.error.issues[0].message });

		const { key } = await createApiKey(org.id, name.data, user.id);
		return { created: { name: name.data, key } };
	},
	revoke: async (event) => {
		const { org } = await requireOrgRole(event, event.params.org);
		const form = await event.request.formData();
		await revokeApiKey(org.id, String(form.get('id')));
		return { message: m.api_keys_revoked() };
	}
};
