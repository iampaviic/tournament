import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toTournament } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { startNextStage } from '#lib/server/services/stages.ts';
import { getTournamentById } from '#lib/server/services/tournaments.ts';

export const POST = endpoint(api.startNextStage, async ({ key, params }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await startNextStage(tournament);
	return toTournament((await getTournamentById(tournament.id))!);
});

export const fallback = methodNotAllowed;
