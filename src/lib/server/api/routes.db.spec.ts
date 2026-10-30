import { beforeEach, describe, expect, it } from 'vitest';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	matchMessages,
	matchReports,
	matches,
	tournaments,
	type Organization,
	type Tournament
} from '#lib/server/db/schema.ts';
import { createApiKey } from '#lib/server/services/apiKeys.ts';
import { createOrganization } from '#lib/server/services/organizations.ts';
import { addParticipant, listParticipants } from '#lib/server/services/participants.ts';
import { startTournament } from '#lib/server/services/stages.ts';
import { steamHeaderImage } from '#lib/server/services/steam.ts';
import {
	createTournament,
	getTournamentById,
	setStatus
} from '#lib/server/services/tournaments.ts';
import { createUser, resetDatabase } from '#lib/server/testing/factories.ts';
import * as steamAppsRoute from '../../../routes/api/v1/steam/apps/+server';
import * as tournamentRoute from '../../../routes/api/v1/tournaments/[tournamentId]/+server';
import * as matchesRoute from '../../../routes/api/v1/tournaments/[tournamentId]/matches/+server';
import * as helpRoute from '../../../routes/api/v1/tournaments/[tournamentId]/matches/[matchId]/help/+server';
import * as messagesRoute from '../../../routes/api/v1/tournaments/[tournamentId]/matches/[matchId]/messages/+server';
import * as reportsRoute from '../../../routes/api/v1/tournaments/[tournamentId]/matches/[matchId]/reports/+server';
import * as resultRoute from '../../../routes/api/v1/tournaments/[tournamentId]/matches/[matchId]/result/+server';
import * as openCheckInRoute from '../../../routes/api/v1/tournaments/[tournamentId]/open-check-in/+server';
import * as openRegistrationRoute from '../../../routes/api/v1/tournaments/[tournamentId]/open-registration/+server';
import * as participantRoute from '../../../routes/api/v1/tournaments/[tournamentId]/participants/[participantId]/+server';
import * as checkInRoute from '../../../routes/api/v1/tournaments/[tournamentId]/participants/[participantId]/check-in/+server';
import * as shuffleRoute from '../../../routes/api/v1/tournaments/[tournamentId]/participants/shuffle/+server';
import * as requirementsRoute from '../../../routes/api/v1/tournaments/[tournamentId]/requirements/+server';
import * as startNextStageRoute from '../../../routes/api/v1/tournaments/[tournamentId]/start-next-stage/+server';
import * as themeRoute from '../../../routes/api/v1/tournaments/[tournamentId]/theme/+server';
import * as unpublishRoute from '../../../routes/api/v1/tournaments/[tournamentId]/unpublish/+server';

let org: Organization;
let tournament: Tournament;
let key: string;

beforeEach(async () => {
	await resetDatabase();
	const owner = await createUser('owner');
	org = await createOrganization(owner.id, { name: 'Club', slug: 'club', description: '' });
	({ key } = await createApiKey(org.id, 'Bot', owner.id));
	tournament = await createTournament(org.id, { name: 'Cup', slug: 'cup' });
});

/**
 * Calls a route's handler like SvelteKit would, with the API key, for the tournament unless
 * `params` names another one.
 */
const call = async (
	handler: RequestHandler,
	{
		method = 'GET',
		params = {},
		body,
		query = {}
	}: {
		method?: string;
		params?: Record<string, string>;
		body?: unknown;
		query?: Record<string, string>;
	} = {}
) => {
	const url = new URL('http://localhost/api/v1/test');
	for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
	const request = new Request(url, {
		method,
		headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	return handler({
		request,
		url,
		params: { tournamentId: tournament.id, ...params }
	} as unknown as RequestEvent);
};

const reload = async () => (tournament = (await getTournamentById(tournament.id))!);

/** Starts a single elimination of `n` players, seeded p1…pn. */
async function start(n: number) {
	for (let i = 1; i <= n; i++) {
		await createUser(`p${i}`);
		await addParticipant(tournament, `p${i}`);
	}
	await setStatus(tournament, 'registration');
	await reload();
	await startTournament(tournament);
	await reload();
	return listParticipants(tournament.id);
}

describe('PATCH /tournaments/{tournamentId}', () => {
	it('keeps the fields left out', async () => {
		const response = await call(tournamentRoute.PATCH, {
			method: 'PATCH',
			body: { description: 'Every Friday.' }
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			name: 'Cup',
			slug: 'cup',
			description: 'Every Friday.',
			startsAt: null
		});
		expect(await reload()).toMatchObject({ name: 'Cup', description: 'Every Friday.' });
	});

	it('stores the start time', async () => {
		const response = await call(tournamentRoute.PATCH, {
			method: 'PATCH',
			body: { startsAt: '2030-05-01T18:00:00Z' }
		});
		expect((await response.json()).startsAt).toBe('2030-05-01T18:00:00.000Z');
		expect((await reload()).startsAt).toEqual(new Date('2030-05-01T18:00:00Z'));
	});

	it("keeps or clears the game, and rejects games it can't look up", async () => {
		const game = { appId: 10, name: 'Counter-Strike', headerImage: steamHeaderImage(10) };
		await db.update(tournaments).set({ game }).where(eq(tournaments.id, tournament.id));

		// The same game is kept without a lookup; db tests have no Steam API key.
		const same = await call(tournamentRoute.PATCH, {
			method: 'PATCH',
			body: { game: { appId: 10 } }
		});
		expect((await same.json()).game).toEqual(game);

		const other = await call(tournamentRoute.PATCH, {
			method: 'PATCH',
			body: { name: 'Renamed', game: { appId: 20 } }
		});
		expect(other.status).toBe(422);
		expect(await reload()).toMatchObject({ name: 'Cup', game });

		const cleared = await call(tournamentRoute.PATCH, { method: 'PATCH', body: { game: null } });
		expect((await cleared.json()).game).toBeNull();
		expect((await reload()).game).toBeNull();
	});
});

describe('DELETE /tournaments/{tournamentId}', () => {
	it('only deletes drafts', async () => {
		await setStatus(tournament, 'registration');
		const published = await call(tournamentRoute.DELETE, { method: 'DELETE' });
		expect(published.status).toBe(409);
		expect(await getTournamentById(tournament.id)).toBeDefined();

		const draft = await createTournament(org.id, { name: 'Draft', slug: 'draft' });
		const deleted = await call(tournamentRoute.DELETE, {
			method: 'DELETE',
			params: { tournamentId: draft.id }
		});
		expect(deleted.status).toBe(204);
		expect(await getTournamentById(draft.id)).toBeUndefined();
	});
});

describe('PUT /tournaments/{tournamentId}/theme', () => {
	it('picks installed themes only', async () => {
		const picked = await call(themeRoute.PUT, { method: 'PUT', body: { themeId: 'tetrio' } });
		expect(picked.status).toBe(200);
		expect((await picked.json()).themeId).toBe('tetrio');

		const unknown = await call(themeRoute.PUT, { method: 'PUT', body: { themeId: 'nope' } });
		expect(unknown.status).toBe(422);
		expect((await reload()).themeId).toBe('tetrio');
	});
});

describe('/tournaments/{tournamentId}/requirements', () => {
	const put = (requirements: unknown[]) =>
		call(requirementsRoute.PUT, { method: 'PUT', body: { requirements } });

	it('stores no options for modules without any', async () => {
		const response = await put([{ moduleId: 'dev', config: { foo: 1 } }]);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([{ moduleId: 'dev', config: {} }]);
		expect(await (await call(requirementsRoute.GET)).json()).toEqual([
			{ moduleId: 'dev', config: {} }
		]);
	});

	it('rejects modules that are not enabled', async () => {
		const response = await put([{ moduleId: 'steam', config: {} }]);
		expect(response.status).toBe(422);
		expect(await (await call(requirementsRoute.GET)).json()).toEqual([]);
	});

	it("can't change once the tournament has started", async () => {
		await start(2);
		expect((await put([])).status).toBe(409);
	});
});

describe('lifecycle', () => {
	const post = (handler: RequestHandler) => call(handler, { method: 'POST' });

	it('unpublishes a tournament nobody signed up for', async () => {
		expect((await (await post(openRegistrationRoute.POST)).json()).status).toBe('registration');
		const response = await post(unpublishRoute.POST);
		expect(response.status).toBe(200);
		expect((await response.json()).status).toBe('draft');
	});

	it('opens check-in', async () => {
		await post(openRegistrationRoute.POST);
		const response = await post(openCheckInRoute.POST);
		expect(response.status).toBe(200);
		expect((await response.json()).status).toBe('check_in');
	});

	it("can't start a next stage when there is only one", async () => {
		await start(2);
		const response = await post(startNextStageRoute.POST);
		expect(response.status).toBe(409);
		expect((await response.json()).error.message).toBe('There is no next stage to start.');
	});
});

describe('participants', () => {
	async function withPlayers(n: number) {
		for (let i = 1; i <= n; i++) {
			await createUser(`p${i}`);
			await addParticipant(tournament, `p${i}`);
		}
		return listParticipants(tournament.id);
	}

	it('shuffles the seeds', async () => {
		await withPlayers(3);
		const response = await call(shuffleRoute.POST, { method: 'POST' });
		expect(response.status).toBe(200);
		const list: { seed: number }[] = await response.json();
		expect(list.map((p) => p.seed).toSorted()).toEqual([1, 2, 3]);
	});

	it('checks a participant in', async () => {
		const [p1] = await withPlayers(1);
		const response = await call(checkInRoute.PUT, {
			method: 'PUT',
			params: { participantId: p1.id },
			body: { checkedIn: true }
		});
		expect(response.status).toBe(200);
		expect((await response.json()).checkedInAt).not.toBeNull();
		expect((await listParticipants(tournament.id))[0].checkedInAt).toBeInstanceOf(Date);
	});

	it('removes a participant', async () => {
		const [p1] = await withPlayers(1);
		const response = await call(participantRoute.DELETE, {
			method: 'DELETE',
			params: { participantId: p1.id }
		});
		expect(response.status).toBe(204);
		expect(await listParticipants(tournament.id)).toEqual([]);
	});
});

describe('matches', () => {
	it('filters by the statuses players see, without byes', async () => {
		await start(3);
		const ready = await call(matchesRoute.GET, { query: { status: 'ready' } });
		expect(ready.status).toBe(200);
		expect(await ready.json()).toHaveLength(1);

		const byes = await call(matchesRoute.GET, { query: { status: 'bye' } });
		expect(byes.status).toBe(400);
	});

	it('lists the messages of a match', async () => {
		await start(3);
		const [semi] = await (await call(matchesRoute.GET, { query: { status: 'ready' } })).json();
		const params = { matchId: semi.id };

		const posted = await call(messagesRoute.POST, { method: 'POST', params, body: { body: 'GL' } });
		expect(posted.status).toBe(201);
		const listed = await call(messagesRoute.GET, { params });
		expect(await listed.json()).toEqual([
			expect.objectContaining({ body: 'GL', asOrganizer: true, author: null, apiKey: 'Bot' })
		]);
	});

	it("doesn't change byes", async () => {
		await start(3);
		const [bye] = await db.select().from(matches).where(eq(matches.status, 'bye'));
		await db.update(matches).set({ helpRequested: true }).where(eq(matches.id, bye.id));
		const [before] = await db.select().from(matches).where(eq(matches.id, bye.id));
		const params = { matchId: bye.id };
		const participantId = (bye.participant1Id ?? bye.participant2Id)!;

		const responses = [
			await call(messagesRoute.POST, { method: 'POST', params, body: { body: 'hi' } }),
			await call(messagesRoute.GET, { params }),
			await call(resultRoute.PUT, { method: 'PUT', params, body: { scores: [2, 0] } }),
			await call(resultRoute.DELETE, { method: 'DELETE', params }),
			await call(reportsRoute.POST, {
				method: 'POST',
				params,
				body: { participantId, scores: [2, 0] }
			}),
			await call(helpRoute.DELETE, { method: 'DELETE', params })
		];
		for (const response of responses) {
			expect(response.status).toBe(404);
			expect((await response.json()).error).toEqual({
				code: 'not_found',
				message: 'Match not found.'
			});
		}

		expect(await db.select().from(matchMessages).where(eq(matchMessages.matchId, bye.id))).toEqual(
			[]
		);
		expect(await db.select().from(matchReports).where(eq(matchReports.matchId, bye.id))).toEqual(
			[]
		);
		const [after] = await db.select().from(matches).where(eq(matches.id, bye.id));
		expect(after).toEqual(before);
		expect(after.helpRequested).toBe(true);
	});
});

describe('GET /steam/apps', () => {
	it('finds nothing without a Steam API key', async () => {
		const response = await call(steamAppsRoute.GET, { query: { q: 'x' } });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	});

	it('needs a query', async () => {
		expect((await call(steamAppsRoute.GET)).status).toBe(400);
	});
});
