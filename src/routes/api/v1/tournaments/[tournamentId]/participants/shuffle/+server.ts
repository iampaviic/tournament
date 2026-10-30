import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toParticipants } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { shuffleSeeds } from '#lib/server/services/participants.ts';

export const POST = endpoint(api.shuffleSeeds, async ({ key, params }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await shuffleSeeds(tournament);
	return toParticipants(tournament.id);
});

export const fallback = methodNotAllowed;
