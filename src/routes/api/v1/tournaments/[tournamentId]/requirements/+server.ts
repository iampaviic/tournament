import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { listModules } from '#lib/server/modules/registry.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { parseRequirements } from '#lib/server/services/requirements.ts';
import { getRequirements, setRequirements } from '#lib/server/services/tournaments.ts';

export const GET = endpoint(api.getRequirements, async ({ key, params }) =>
	getRequirements((await requireApiTournament(key, params.tournamentId)).id)
);

export const PUT = endpoint(api.setRequirements, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	const parsed = parseRequirements(body.requirements, listModules());
	if (!parsed.ok) throw new ServiceError(parsed.error, 'invalid');
	await setRequirements(tournament, parsed.requirements);
	return getRequirements(tournament.id);
});

export const fallback = methodNotAllowed;
