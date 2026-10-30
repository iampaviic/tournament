import { loadSheet } from '#lib/server/bracketSheet.ts';
import { loadTournament } from '#lib/server/auth/tournament.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await loadTournament(event);
	return loadSheet(tournament, event.locals.user?.id);
};
