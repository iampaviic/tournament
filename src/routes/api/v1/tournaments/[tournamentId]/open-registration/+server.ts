import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toTournament } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { getTournamentById, setStatus } from '#lib/server/services/tournaments.ts';

export const POST = endpoint(api.openRegistration, async ({ key, params }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	await setStatus(tournament, 'registration');
	return toTournament((await getTournamentById(tournament.id))!);
});

export const fallback = methodNotAllowed;
