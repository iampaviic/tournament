import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { matchDetail } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { clearHelp } from '#lib/server/services/matches.ts';

export const DELETE = endpoint(api.clearHelp, async ({ key, params }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await clearHelp(tournament, params.matchId);
	return matchDetail(tournament.id, params.matchId);
});

export const fallback = methodNotAllowed;
