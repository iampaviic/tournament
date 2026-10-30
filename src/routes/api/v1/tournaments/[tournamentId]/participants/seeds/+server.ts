import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toParticipants } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { setSeeds } from '#lib/server/services/participants.ts';

export const PUT = endpoint(api.setSeeds, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await setSeeds(tournament, body.participantIds);
	return toParticipants(tournament.id);
});

export const fallback = methodNotAllowed;
