import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { matchDetail } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';

export const GET = endpoint(api.getMatch, async ({ key, params }) =>
	matchDetail((await requireApiTournament(key, params.tournamentId)).id, params.matchId)
);

export const fallback = methodNotAllowed;
