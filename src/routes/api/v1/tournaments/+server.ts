import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { toSummary, toTournament } from '#lib/server/api/responses.ts';
import { createTournament, listOrgTournaments } from '#lib/server/services/tournaments.ts';

export const GET = endpoint(api.listTournaments, async ({ key }) =>
	(await listOrgTournaments(key.orgId, { includeDrafts: true })).map(toSummary)
);

export const POST = endpoint(api.createTournament, async ({ key, body }) =>
	toTournament(await createTournament(key.orgId, body))
);

export const fallback = methodNotAllowed;
