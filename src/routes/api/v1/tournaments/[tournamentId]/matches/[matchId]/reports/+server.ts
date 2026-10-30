import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { matchDetail } from '#lib/server/api/responses.ts';
import { requireApiTournament } from '#lib/server/auth/apiKey.ts';
import { reportForParticipant } from '#lib/server/services/matches.ts';

export const POST = endpoint(api.reportMatch, async ({ key, params, body }) => {
	const tournament = await requireApiTournament(key, params.tournamentId);
	const outcome = await reportForParticipant(
		tournament,
		params.matchId,
		{ participantId: body.participantId, apiKeyId: key.id },
		body.scores
	);
	return { outcome, match: await matchDetail(tournament.id, params.matchId) };
});

export const fallback = methodNotAllowed;
