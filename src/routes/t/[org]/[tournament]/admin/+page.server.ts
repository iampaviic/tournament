import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { startNextStage, startTournament } from '#lib/server/services/stages.ts';
import {
	deleteTournament,
	setStatus,
	tournamentSchema,
	updateTournament
} from '#lib/server/services/tournaments.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await requireTournamentAdmin(event);
	return {
		settings: {
			name: tournament.name,
			slug: tournament.slug,
			description: tournament.description,
			startsAt: tournament.startsAt,
			participantLimit: tournament.participantLimit
		}
	};
};

export const actions: Actions = {
	update: async (event) => {
		const { tournament, org } = await requireTournamentAdmin(event);
		const form = await event.request.formData();
		const startsAt = String(form.get('startsAt') ?? '');
		const limit = String(form.get('participantLimit') ?? '').trim();
		const values = {
			name: String(form.get('name') ?? ''),
			slug: String(form.get('slug') ?? ''),
			description: String(form.get('description') ?? ''),
			startsAt: startsAt ? new Date(startsAt) : null,
			participantLimit: limit ? Number(limit) : null
		};

		const parsed = tournamentSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: z.flattenError(parsed.error).fieldErrors });
		}
		let updated;
		try {
			updated = await updateTournament(tournament, parsed.data);
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { values, errors: { slug: [e.message] } });
			throw e;
		}
		if (updated.slug !== tournament.slug) redirect(303, `/t/${org.slug}/${updated.slug}/admin`);
		return { saved: true };
	},

	delete: async (event) => {
		const { tournament, org } = await requireTournamentAdmin(event);
		const form = await event.request.formData();
		if (String(form.get('confirm') ?? '').trim() !== tournament.slug) {
			return fail(400, { deleteError: m.org_delete_mismatch() });
		}
		await deleteTournament(tournament.id);
		redirect(303, `/o/${org.slug}/admin/tournaments`);
	},

	/** Moves the tournament to its next phase. Posted from the panel on every admin page. */
	lifecycle: async (event) => {
		const { tournament } = await requireTournamentAdmin(event);
		const to = String((await event.request.formData()).get('to'));
		try {
			if (to === 'running') await startTournament(tournament);
			else if (to === 'next_stage') await startNextStage(tournament);
			else if (to === 'draft' || to === 'registration' || to === 'check_in') {
				await setStatus(tournament, to);
			} else return fail(400, { lifecycleError: 'Unknown step.' });
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { lifecycleError: e.message });
			throw e;
		}
	}
};
