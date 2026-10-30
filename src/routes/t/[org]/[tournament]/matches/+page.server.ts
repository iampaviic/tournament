import { loadTournament } from '#lib/server/auth/tournament.ts';
import { listMatches } from '#lib/server/services/matches.ts';
import { listParticipants } from '#lib/server/services/participants.ts';
import { getBracket } from '#lib/server/services/stages.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await loadTournament(event);
	const user = event.locals.user;
	const participants = await listParticipants(tournament.id);
	const stages = await getBracket(tournament.id);
	return {
		matches: await listMatches(stages),
		names: Object.fromEntries(participants.map((p) => [p.id, p.displayName])),
		/** The viewer's participant id. */
		me: participants.find((p) => p.userId === user?.id)?.id ?? null,
		stageCount: stages.length,
		stages: stages.map((stage) => ({ index: stage.index, groupCount: stage.groups.length }))
	};
};
