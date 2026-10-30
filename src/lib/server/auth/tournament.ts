import { error, type RequestEvent } from '@sveltejs/kit';
import { getMemberRole } from '#lib/server/services/organizations.ts';
import { getTournament } from '#lib/server/services/tournaments.ts';
import { m } from '#lib/paraglide/messages.js';
import { requireOrgRole } from './org';

type Event = Pick<RequestEvent, 'locals' | 'url'> & { params: { org: string; tournament: string } };

/** Loads a tournament for its public pages. Drafts are only visible to the organization. */
export async function loadTournament(event: Event) {
	const found = await getTournament(event.params.org, event.params.tournament);
	if (!found) error(404, m.error_tournament_not_found());
	const user = event.locals.user;
	const isMember = user ? Boolean(await getMemberRole(found.org.id, user.id)) : false;
	if (found.tournament.status === 'draft' && !isMember) error(404, m.error_tournament_not_found());
	return { ...found, isMember };
}

/** Guards a tournament's admin pages, like `requireOrgRole` for its organization. */
export async function requireTournamentAdmin(event: Event) {
	const found = await getTournament(event.params.org, event.params.tournament);
	if (!found) error(404, m.error_tournament_not_found());
	const access = await requireOrgRole(event, found.org.slug);
	return { ...access, tournament: found.tournament };
}
