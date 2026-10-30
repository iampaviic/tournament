import { loadTournament } from '#lib/server/auth/tournament.ts';
import { eventStream } from '#lib/server/events.ts';
import type { RequestHandler } from './$types';

/** Live updates for the matches page: `update` whenever a match of the tournament changes. */
export const GET: RequestHandler = async (event) => {
	const { tournament } = await loadTournament(event);
	return eventStream(tournament.id, event.request.signal, (e) =>
		e.type === 'matches' ? { event: 'update', data: null } : null
	);
};
