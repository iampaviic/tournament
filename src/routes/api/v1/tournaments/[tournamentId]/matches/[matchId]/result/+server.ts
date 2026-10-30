import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { matchDetail, requireApiMatch } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { clearMatchResult, setMatchResult } from '#lib/server/services/matches.ts';

export const PUT = endpoint(api.setMatchResult, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await requireApiMatch(tournament.id, params.matchId);
	await setMatchResult(tournament, params.matchId, body.scores, { apiKeyId: key.id });
	return matchDetail(tournament.id, params.matchId);
});

export const DELETE = endpoint(api.clearMatchResult, async ({ key, params }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await requireApiMatch(tournament.id, params.matchId);
	await clearMatchResult(tournament, params.matchId);
	return matchDetail(tournament.id, params.matchId);
});

export const fallback = methodNotAllowed;
