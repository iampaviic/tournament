import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireTrusted } from '#lib/server/auth/guards.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { createOrganization, organizationSchema } from '#lib/server/services/organizations.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	requireTrusted(event);
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireTrusted(event);
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

		let slug: string;
		try {
			({ slug } = await createOrganization(user.id, parsed.data));
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { values, errors: { slug: [e.message] } });
			throw e;
		}
		redirect(303, `/o/${slug}/admin`);
	}
};
