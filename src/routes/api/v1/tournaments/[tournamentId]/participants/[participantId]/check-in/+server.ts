import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toParticipants } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { setCheckedIn } from '#lib/server/services/participants.ts';

export const PUT = endpoint(api.setCheckIn, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await setCheckedIn(tournament, params.participantId, body.checkedIn);
	return (await toParticipants(tournament.id)).find((p) => p.id === params.participantId)!;
});

export const fallback = methodNotAllowed;
