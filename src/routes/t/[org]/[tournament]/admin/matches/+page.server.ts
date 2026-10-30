import { fail } from '@sveltejs/kit';
import { requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { listParticipants } from '#lib/server/services/participants.ts';
import { clearMatchResult, getBracket, setMatchResult } from '#lib/server/services/stages.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await requireTournamentAdmin(event);
	const participants = await listParticipants(tournament.id);
	const stages = await getBracket(tournament.id);
	return {
		stageCount: stages.length,
		stages: stages.filter((stage) => stage.status !== 'pending'),
		names: Object.fromEntries(participants.map((p) => [p.id, p.displayName]))
	};
};

export const actions: Actions = {
	result: async (event) => {
		const { tournament } = await requireTournamentAdmin(event);
		const form = await event.request.formData();
		const scores: [number, number] = [Number(form.get('score1')), Number(form.get('score2'))];
		try {
			await setMatchResult(tournament, String(form.get('matchId')), scores);
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { error: e.message });
			throw e;
		}
		return { message: m.matches_saved() };
	},
	clear: async (event) => {
		const { tournament } = await requireTournamentAdmin(event);
		const form = await event.request.formData();
		try {
			await clearMatchResult(tournament, String(form.get('matchId')));
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { error: e.message });
			throw e;
		}
	}
};
