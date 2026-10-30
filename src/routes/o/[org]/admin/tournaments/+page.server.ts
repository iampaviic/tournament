import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireOrgRole } from '#lib/server/auth/org.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import {
	createTournament,
	listOrgTournaments,
	tournamentSchema
} from '#lib/server/services/tournaments.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { org } = await requireOrgRole(event, event.params.org);
	return { tournaments: await listOrgTournaments(org.id, { includeDrafts: true }) };
};

const createSchema = tournamentSchema.pick({ name: true, slug: true });

export const actions: Actions = {
	default: async (event) => {
		const { org } = await requireOrgRole(event, event.params.org);
		const form = await event.request.formData();
		const values = { name: String(form.get('name') ?? ''), slug: String(form.get('slug') ?? '') };
		const parsed = createSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: z.flattenError(parsed.error).fieldErrors });
		}

		let slug: string;
		try {
			({ slug } = await createTournament(org.id, parsed.data));
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { values, errors: { slug: [e.message] } });
			throw e;
		}
		redirect(303, `/t/${org.slug}/${slug}/admin`);
	}
};
