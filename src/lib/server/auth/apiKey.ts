import { error, type RequestEvent } from '@sveltejs/kit';
import { verifyApiKey } from '#lib/server/services/apiKeys.ts';
import { getTournamentById } from '#lib/server/services/tournaments.ts';

/** The organization a REST API request acts for, and the key's name for what it writes. */
export type ApiKeyAccess = NonNullable<Awaited<ReturnType<typeof verifyApiKey>>>;

/** Guards the REST API: requires `Authorization: Bearer <key>` with a valid key of any organization. */
export async function requireApiKey(event: Pick<RequestEvent, 'request'>) {
	const match = /^Bearer (\S+)$/i.exec(event.request.headers.get('authorization') ?? '');
	if (!match) error(401, 'Send an API key in the Authorization header: Bearer tm_….');
	const key = await verifyApiKey(match[1]);
	if (!key) error(401, 'The API key is invalid or has been revoked.');
	return key;
}

/** A tournament of the key's organization. Other organizations' tournaments are not found either. */
export async function requireApiTournament(key: ApiKeyAccess, tournamentId: string) {
	const tournament = await getTournamentById(tournamentId);
	if (!tournament || tournament.orgId !== key.orgId) error(404, 'Tournament not found.');
	return tournament;
}
