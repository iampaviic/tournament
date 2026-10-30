import { fail } from '@sveltejs/kit';
import { requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { matchQueue } from '#lib/matchReports.ts';
import {
	clearHelp,
	clearMatchResult,
	listMatches,
	matchIdSchema,
	scoresSchema,
	setMatchResult
} from '#lib/server/services/matches.ts';
import { listParticipants } from '#lib/server/services/participants.ts';
import { getBracket } from '#lib/server/services/stages.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await requireTournamentAdmin(event);
	const participants = await listParticipants(tournament.id);
	const stages = await getBracket(tournament.id);
	return {
		stageCount: stages.length,
		stages: stages.filter((stage) => stage.status !== 'pending'),
		names: Object.fromEntries(participants.map((p) => [p.id, p.displayName])),
		queue: matchQueue(await listMatches(stages))
	};
};

export const actions: Actions = {
	result: async (event) => {
		const { tournament, user } = await requireTournamentAdmin(event);
		const form = await event.request.formData();
		const id = matchIdSchema.safeParse(form.get('matchId'));
		if (!id.success) return fail(400, { error: id.error.issues[0].message });
		const scores = scoresSchema.safeParse({
			score1: form.get('score1'),
			score2: form.get('score2')
		});
		if (!scores.success) return fail(400, { error: scores.error.issues[0].message });
		try {
			await setMatchResult(tournament, id.data, scores.data, { userId: user.id });
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { error: e.message });
			throw e;
		}
		return { message: m.matches_saved() };
	},
	clear: async (event) => {
		const { tournament } = await requireTournamentAdmin(event);
		const form = await event.request.formData();
		const id = matchIdSchema.safeParse(form.get('matchId'));
		if (!id.success) return fail(400, { error: id.error.issues[0].message });
		try {
			await clearMatchResult(tournament, id.data);
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { error: e.message });
			throw e;
		}
	},
	clearHelp: async (event) => {
		const { tournament } = await requireTournamentAdmin(event);
		const form = await event.request.formData();
		const id = matchIdSchema.safeParse(form.get('matchId'));
		if (!id.success) return fail(400, { error: id.error.issues[0].message });
		try {
			await clearHelp(tournament, id.data);
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { error: e.message });
			throw e;
		}
	}
};
