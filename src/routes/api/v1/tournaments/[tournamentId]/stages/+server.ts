import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toStages } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { getBracket } from '#lib/server/services/stages.ts';
import { setStructure } from '#lib/server/services/tournaments.ts';

export const GET = endpoint(api.listStages, async ({ key, params }) =>
	toStages(await getBracket((await requireApiTournament(key, params.tournamentId)).id))
);

export const PUT = endpoint(api.setStages, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await setStructure(tournament, body.stages);
	return toStages(await getBracket(tournament.id));
});

export const fallback = methodNotAllowed;
