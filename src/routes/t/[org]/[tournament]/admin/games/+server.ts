import { json } from '@sveltejs/kit';
import { requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { steamApps } from '#lib/server/services/steam.ts';
import type { RequestHandler } from './$types';

/** The game picker's search as you type. The REST API has the same search for API keys. */
export const GET: RequestHandler = async (event) => {
	await requireTournamentAdmin(event);
	return json(await steamApps.search(event.url.searchParams.get('q') ?? ''));
};
