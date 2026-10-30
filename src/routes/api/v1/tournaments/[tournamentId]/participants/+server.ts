import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toParticipants } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { addParticipant } from '#lib/server/services/participants.ts';

export const GET = endpoint(api.listParticipants, async ({ key, params }) =>
	toParticipants((await requireApiTournament(key, params.tournamentId)).id)
);

export const POST = endpoint(api.addParticipant, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	const id = await addParticipant(tournament, body.username);
	return (await toParticipants(tournament.id)).find((p) => p.id === id)!;
});

export const fallback = methodNotAllowed;
