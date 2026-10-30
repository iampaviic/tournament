import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireOrgRole } from '#lib/server/auth/org.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import {
	deleteOrganization,
	organizationSchema,
	updateOrganization
} from '#lib/server/services/organizations.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { org } = await requireOrgRole(event, event.params.org);
	return { settings: { name: org.name, slug: org.slug, description: org.description } };
};

export const actions: Actions = {
	update: async (event) => {
		const { org } = await requireOrgRole(event, event.params.org);
		const form = await event.request.formData();
		const values = {
			name: String(form.get('name') ?? ''),
			slug: String(form.get('slug') ?? ''),
			description: String(form.get('description') ?? '')
		};

		const parsed = organizationSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: z.flattenError(parsed.error).fieldErrors });
		}
		let updated;
		try {
			updated = await updateOrganization(org.id, parsed.data);
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { values, errors: { slug: [e.message] } });
			throw e;
		}
		// The address is part of the URL, so a new one means a new page.
		if (updated.slug !== org.slug) redirect(303, `/o/${updated.slug}/admin`);
		return { saved: true };
	},

	delete: async (event) => {
		const { org } = await requireOrgRole(event, event.params.org, 'owner');
		const form = await event.request.formData();
		if (String(form.get('confirm') ?? '').trim() !== org.slug) {
			return fail(400, { deleteError: m.org_delete_mismatch() });
		}
		await deleteOrganization(org.id);
		redirect(303, '/dashboard');
	}
};
