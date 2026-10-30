import { error } from '@sveltejs/kit';
import { loadTournament } from '#lib/server/auth/tournament.ts';
import { eventStream } from '#lib/server/events.ts';
import { getMatch, matchIdSchema } from '#lib/server/services/matches.ts';
import { m } from '#lib/paraglide/messages.js';
import type { RequestHandler } from './$types';

/** Live updates for a match room: its chat messages, and `update` whenever the match changes. */
export const GET: RequestHandler = async (event) => {
	const { tournament } = await loadTournament(event);
	const id = matchIdSchema.safeParse(event.params.id);
	if (!id.success || !(await getMatch(tournament.id, id.data)))
		error(404, m.error_match_not_found());
	const matchId = id.data;
	return eventStream(tournament.id, event.request.signal, (e) => {
		if (e.type === 'chat') return e.matchId === matchId ? { event: 'chat', data: e.message } : null;
		return e.matchIds.includes(matchId) ? { event: 'update', data: null } : null;
	});
};
