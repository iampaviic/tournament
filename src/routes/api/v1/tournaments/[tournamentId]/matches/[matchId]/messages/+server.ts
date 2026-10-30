import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { requireApiMatch, toMessage } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { listMessages, postMessage } from '#lib/server/services/chat.ts';

export const GET = endpoint(api.listMessages, async ({ key, params }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await requireApiMatch(tournament.id, params.matchId);
	return (await listMessages(params.matchId)).map(toMessage);
});

export const POST = endpoint(api.postMessage, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await requireApiMatch(tournament.id, params.matchId);
	return toMessage(
		await postMessage(tournament, params.matchId, { apiKeyName: key.name }, body.body)
	);
});

export const fallback = methodNotAllowed;
