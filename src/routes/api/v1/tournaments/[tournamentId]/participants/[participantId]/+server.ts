import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { removeParticipant } from '#lib/server/services/participants.ts';

export const DELETE = endpoint(api.removeParticipant, async ({ key, params }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await removeParticipant(tournament, params.participantId);
});

export const fallback = methodNotAllowed;
