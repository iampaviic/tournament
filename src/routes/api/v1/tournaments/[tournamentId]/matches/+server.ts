import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toMatch } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { listMatches } from '#lib/server/services/matches.ts';
import { getBracket } from '#lib/server/services/stages.ts';

export const GET = endpoint(api.listMatches, async ({ key, params, query }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	return (await listMatches(await getBracket(tournament.id)))
		.filter(
			(match) =>
				(query.stage === undefined || match.stageIndex === query.stage) &&
				(query.status === undefined || match.progress === query.status)
		)
		.map(toMatch);
});

export const fallback = methodNotAllowed;
