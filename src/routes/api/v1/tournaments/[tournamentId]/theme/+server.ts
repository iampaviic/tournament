import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toTournament } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { getTournamentById, setTheme } from '#lib/server/services/tournaments.ts';

export const PUT = endpoint(api.setTheme, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await setTheme(tournament, body.themeId);
	return toTournament((await getTournamentById(tournament.id))!);
});

export const fallback = methodNotAllowed;
