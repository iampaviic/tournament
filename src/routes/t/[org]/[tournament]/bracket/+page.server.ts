import { loadTournament } from '#lib/server/auth/tournament.ts';
import { listParticipants } from '#lib/server/services/participants.ts';
import { getBracket } from '#lib/server/services/stages.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await loadTournament(event);
	const participants = await listParticipants(tournament.id);
	return {
		stages: await getBracket(tournament.id),
		names: Object.fromEntries(participants.map((p) => [p.id, p.displayName]))
	};
};
