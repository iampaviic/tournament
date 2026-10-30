import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toTournament } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { deleteDraftTournament, updateTournament } from '#lib/server/services/tournaments.ts';

export const GET = endpoint(api.getTournament, async ({ key, params }) =>
	toTournament(await requireApiTournament(key, params.tournamentId))
);

export const PATCH = endpoint(api.updateTournament, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	const { name, slug, description, startsAt, participantLimit } = tournament;
	return toTournament(
		await updateTournament(tournament, {
			name,
			slug,
			description,
			startsAt,
			participantLimit,
			...body
		})
	);
});

export const DELETE = endpoint(api.deleteTournament, async ({ key, params }) => {
	await deleteDraftTournament(await requireApiTournament(key, params.tournamentId));
});

export const fallback = methodNotAllowed;
