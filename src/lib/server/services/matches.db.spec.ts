import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { matchQueue } from '#lib/matchReports.ts';
import { db } from '#lib/server/db/index.ts';
import {
	matchReports,
	type Organization,
	type Tournament,
	type User
} from '#lib/server/db/schema.ts';
import { subscribe, type TournamentEvent } from '#lib/server/events.ts';
import { createUser, resetDatabase } from '#lib/server/testing/factories.ts';
import { DEFAULT_STAGE_SETTINGS } from '#lib/tournaments.ts';
import { load as loadRoom } from '../../../routes/t/[org]/[tournament]/matches/[id]/+page.server';
import { createApiKey, listApiKeys, revokeApiKey, verifyApiKey } from './apiKeys';
import { listMessages, postMessage } from './chat';
import {
	clearHelp,
	clearMatchResult,
	getMatch,
	listMatches,
	reportForParticipant,
	reportResult,
	requestHelp,
	setMatchResult
} from './matches';
import { createOrganization } from './organizations';
import { addParticipant, listParticipants } from './participants';
import { getBracket, startTournament } from './stages';
import { createTournament, getTournamentById, setStatus, setStructure } from './tournaments';

let owner: User;
let org: Organization;
let tournament: Tournament;

beforeEach(async () => {
	await resetDatabase();
	owner = await createUser('owner');
	org = await createOrganization(owner.id, { name: 'Club', slug: 'club', description: '' });
	tournament = await createTournament(org.id, { name: 'Cup', slug: 'cup' });
});

const reload = async () => (tournament = (await getTournamentById(tournament.id))!);

/**
 * Starts a single elimination of `n` players, seeded p1…pn. With four, #1 is p1–p4 (`M1-1`), #2 is
 * p2–p3 (`M1-2`) and the final is `M2-1`.
 */
async function start(n = 4) {
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

async function match(templateId: string) {
	const [stage] = await getBracket(tournament.id);
	return stage.groups[0].matches.find((m) => m.template.id === templateId)!;
}

const item = async (matchId: string) => (await getMatch(tournament.id, matchId))!;
const storedReports = (matchId: string) =>
	db.select().from(matchReports).where(eq(matchReports.matchId, matchId));
const organizer = () => ({ userId: owner.id });
const apiKeyId = async () =>
	(await verifyApiKey((await createApiKey(org.id, 'Bot', owner.id)).key))!.id;

describe('reporting', () => {
	it('completes the match when both players report the same scores', async () => {
		const [p1, , , p4] = await start();
		const semi = await match('M1-1');

		expect(await reportResult(tournament, semi.id, p1.userId, [2, 1])).toBe('saved');
		expect(await item(semi.id)).toMatchObject({
			progress: 'reported',
			reports: [{ side: 0, scores: [2, 1] }]
		});

		expect(await reportResult(tournament, semi.id, p4.userId, [2, 1])).toBe('agreed');
		expect(await item(semi.id)).toMatchObject({
			status: 'completed',
			result: { winner: 0, scores: [2, 1] },
			decidedBy: null
		});
		expect((await match('M2-1')).entrants).toContain(p1.id);
	});

	it('lets the reporter change the report until the opponent responds', async () => {
		const [p1, , , p4] = await start();
		const semi = await match('M1-1');

		await reportResult(tournament, semi.id, p1.userId, [2, 1]);
		expect(await reportResult(tournament, semi.id, p1.userId, [2, 0])).toBe('saved');
		expect((await storedReports(semi.id)).map((r) => r.scores)).toEqual([[2, 0]]);

		expect(await reportResult(tournament, semi.id, p4.userId, [2, 0])).toBe('agreed');
		expect((await item(semi.id)).result?.scores).toEqual([2, 0]);
	});

	it('disputes the match when the reports disagree', async () => {
		const [p1, , , p4] = await start();
		const semi = await match('M1-1');

		await reportResult(tournament, semi.id, p1.userId, [2, 1]);
		expect(await reportResult(tournament, semi.id, p4.userId, [1, 2])).toBe('disputed');
		expect(await item(semi.id)).toMatchObject({ status: 'ready', progress: 'disputed' });

		await expect(reportResult(tournament, semi.id, p1.userId, [1, 2])).rejects.toThrow(
			'an organizer will decide'
		);
		await expect(reportResult(tournament, semi.id, p4.userId, [2, 1])).rejects.toThrow(
			'an organizer will decide'
		);
	});

	it('replaces the reports with the result an organizer sets', async () => {
		const [p1, , , p4] = await start();
		const semi = await match('M1-1');
		await reportResult(tournament, semi.id, p1.userId, [2, 1]);
		await reportResult(tournament, semi.id, p4.userId, [1, 2]);
		await requestHelp(tournament, semi.id, p1.userId);

		await setMatchResult(tournament, semi.id, [2, 0], organizer());
		expect(
			(await storedReports(semi.id)).map((r) => [r.source, r.userId, r.participantId, r.scores])
		).toEqual([['organizer', owner.id, null, [2, 0]]]);
		expect(await item(semi.id)).toMatchObject({
			status: 'completed',
			progress: 'completed',
			helpRequested: false,
			reports: [],
			decidedBy: 'organizer'
		});

		await clearMatchResult(tournament, semi.id);
		expect(await storedReports(semi.id)).toEqual([]);
		expect(await item(semi.id)).toMatchObject({ status: 'ready', decidedBy: null });
	});

	it('only lets the players report matches that are being played', async () => {
		const [p1, p2] = await start();
		const semi = await match('M1-1');
		const outsider = await createUser('outsider');

		await expect(reportResult(tournament, semi.id, p2.userId, [2, 0])).rejects.toThrow(
			'Only the players of this match'
		);
		await expect(reportResult(tournament, semi.id, outsider.id, [2, 0])).rejects.toThrow(
			'Only the players of this match'
		);
		await expect(reportResult(tournament, semi.id, p1.userId, [1, 1])).rejects.toThrow(
			'need a winner'
		);
		expect(await storedReports(semi.id)).toEqual([]);

		const final = await match('M2-1');
		await expect(reportResult(tournament, final.id, p1.userId, [2, 0])).rejects.toThrow(
			"can't be reported now"
		);

		await setMatchResult(tournament, semi.id, [2, 0], organizer());
		await expect(reportResult(tournament, semi.id, p1.userId, [2, 0])).rejects.toThrow(
			"can't be reported now"
		);
	});

	it("can't report once the tournament is over", async () => {
		const [p1, p2] = await start(2);
		const final = await match('M1-1');
		await reportResult(tournament, final.id, p1.userId, [2, 0]);
		await reportResult(tournament, final.id, p2.userId, [2, 0]);
		expect((await reload()).status).toBe('completed');

		await expect(reportResult(tournament, final.id, p1.userId, [2, 1])).rejects.toThrow(
			'while the tournament is running'
		);
	});

	it('drops reports and help requests when a correction changes the entrants', async () => {
		const [p1, p2, , p4] = await start();
		const semi1 = await match('M1-1');
		await setMatchResult(tournament, semi1.id, [2, 0], organizer());
		await setMatchResult(tournament, (await match('M1-2')).id, [2, 0], organizer());
		const final = await match('M2-1');
		expect(final.entrants).toEqual([p1.id, p2.id]);
		await reportResult(tournament, final.id, p1.userId, [2, 1]);
		await requestHelp(tournament, final.id, p2.userId);

		await setMatchResult(tournament, semi1.id, [0, 2], organizer());
		expect(await item(final.id)).toMatchObject({
			entrants: [p4.id, p2.id],
			progress: 'ready',
			helpRequested: false,
			reports: []
		});
		expect(await storedReports(final.id)).toEqual([]);
		expect(await reportResult(tournament, final.id, p4.userId, [2, 1])).toBe('saved');
	});
});

describe('reporting with an API key', () => {
	it('reports for both players with the same rules', async () => {
		const [p1, , , p4] = await start();
		const semi = await match('M1-1');
		const keyId = await apiKeyId();

		const by = (participantId: string) => ({ participantId, apiKeyId: keyId });
		expect(await reportForParticipant(tournament, semi.id, by(p1.id), [2, 1])).toBe('saved');
		expect(await reportForParticipant(tournament, semi.id, by(p4.id), [2, 1])).toBe('agreed');
		expect(await item(semi.id)).toMatchObject({ status: 'completed', decidedBy: null });
		expect(
			(await storedReports(semi.id)).map((r) => [r.source, r.participantId, r.userId, r.apiKeyId])
		).toEqual(
			expect.arrayContaining([
				['participant', p1.id, null, keyId],
				['participant', p4.id, null, keyId]
			])
		);
	});

	it('disputes the match when a player and the key disagree', async () => {
		const [p1, , , p4] = await start();
		const semi = await match('M1-1');
		const keyId = await apiKeyId();

		await reportResult(tournament, semi.id, p1.userId, [2, 1]);
		expect(
			await reportForParticipant(
				tournament,
				semi.id,
				{ participantId: p4.id, apiKeyId: keyId },
				[1, 2]
			)
		).toBe('disputed');
	});

	it('only reports for the players of the match', async () => {
		const [, p2] = await start();
		const semi = await match('M1-1');
		const keyId = await apiKeyId();

		await expect(
			reportForParticipant(tournament, semi.id, { participantId: p2.id, apiKeyId: keyId }, [2, 0])
		).rejects.toMatchObject({ kind: 'invalid' });
	});

	it('sets results as the key', async () => {
		await start();
		const semi = await match('M1-1');
		const keyId = await apiKeyId();

		await setMatchResult(tournament, semi.id, [2, 0], { apiKeyId: keyId });
		expect(await item(semi.id)).toMatchObject({ status: 'completed', decidedBy: 'api_key' });
		expect((await storedReports(semi.id)).map((r) => [r.source, r.apiKeyId])).toEqual([
			['api_key', keyId]
		]);
	});
});

describe('help requests', () => {
	it('are raised by the players and cleared by organizers or a result', async () => {
		const [p1, p2, , p4] = await start();
		const semi = await match('M1-1');

		await requestHelp(tournament, semi.id, p4.userId);
		expect((await item(semi.id)).helpRequested).toBe(true);
		await expect(requestHelp(tournament, semi.id, p2.userId)).rejects.toThrow(
			'Only the players of this match can ask for help.'
		);

		await clearHelp(tournament, semi.id);
		expect((await item(semi.id)).helpRequested).toBe(false);

		await requestHelp(tournament, semi.id, p1.userId);
		await reportResult(tournament, semi.id, p1.userId, [2, 0]);
		await reportResult(tournament, semi.id, p4.userId, [2, 0]);
		expect((await item(semi.id)).helpRequested).toBe(false);
	});

	it("can't be raised for a match that isn't being played", async () => {
		const [p1] = await start();
		const final = await match('M2-1');
		await expect(requestHelp(tournament, final.id, p1.userId)).rejects.toThrow(
			'Help can only be requested while the match is being played.'
		);
		expect((await item(final.id)).helpRequested).toBe(false);
	});

	it("can't be raised once the tournament is over", async () => {
		const [p1, p2] = await start(2);
		const final = await match('M1-1');
		await reportResult(tournament, final.id, p1.userId, [2, 0]);
		await reportResult(tournament, final.id, p2.userId, [2, 0]);
		expect((await reload()).status).toBe('completed');

		await expect(requestHelp(tournament, final.id, p1.userId)).rejects.toThrow(
			'Help can only be requested while the match is being played.'
		);
		expect((await item(final.id)).helpRequested).toBe(false);
	});
});

describe('draws', () => {
	it('are agreed in round robin when both players report them', async () => {
		await setStructure(tournament, [
			{ type: 'round_robin', settings: { ...DEFAULT_STAGE_SETTINGS } }
		]);
		const [p1, p2] = await start(2);
		const [stage] = await getBracket(tournament.id);
		const [only] = stage.groups[0].matches;

		expect(await reportResult(tournament, only.id, p1.userId, [1, 1])).toBe('saved');
		expect(await reportResult(tournament, only.id, p2.userId, [1, 1])).toBe('agreed');
		expect(await item(only.id)).toMatchObject({
			status: 'completed',
			result: { winner: null, scores: [1, 1] }
		});
	});
});

describe('match queue', () => {
	it('lists disputes, then help requests, then reported, then ready matches', async () => {
		const players = await start(8);
		const userOf = (id: string | null | undefined) => players.find((p) => p.id === id)!.userId;
		const all = await listMatches(await getBracket(tournament.id));
		const [m1, m2, m3, m4] = [1, 2, 3, 4].map((n) => all.find((m) => m.number === n)!);

		await reportResult(tournament, m4.id, userOf(m4.entrants[0]), [2, 0]);
		await reportResult(tournament, m4.id, userOf(m4.entrants[1]), [0, 2]);
		await requestHelp(tournament, m3.id, userOf(m3.entrants[1]));
		await reportResult(tournament, m2.id, userOf(m2.entrants[0]), [2, 1]);

		const queue = matchQueue(await listMatches(await getBracket(tournament.id)));
		expect(queue.map((m) => m.id)).toEqual([m4.id, m3.id, m2.id, m1.id]);
		expect(queue.map((m) => m.progress)).toEqual(['disputed', 'ready', 'reported', 'ready']);
	});
});

describe('chat', () => {
	it('lets the players and the organizers write', async () => {
		const [p1, p2, , p4] = await start();
		const semi = await match('M1-1');

		const first = await postMessage(
			tournament,
			semi.id,
			{ userId: p1.userId, organizer: false },
			'gl'
		);
		expect(first).toMatchObject({ body: 'gl', asOrganizer: false, author: { username: 'p1' } });
		await expect(
			postMessage(tournament, semi.id, { userId: p2.userId, organizer: false }, 'hi')
		).rejects.toThrow('Only the players of this match and the organizers can write here.');

		const fromOrganizer = await postMessage(
			tournament,
			semi.id,
			{ userId: owner.id, organizer: true },
			'Play on'
		);
		expect(fromOrganizer.asOrganizer).toBe(true);
		// Organizers who play the match write as players.
		await postMessage(tournament, semi.id, { userId: p4.userId, organizer: true }, 'ok');

		expect(
			(await listMessages(semi.id)).map((m) => [m.author?.username, m.body, m.asOrganizer])
		).toEqual([
			['p1', 'gl', false],
			['owner', 'Play on', true],
			['p4', 'ok', false]
		]);
	});

	it("labels messages posted with an API key with the key's name", async () => {
		await start();
		const semi = await match('M1-1');
		await createApiKey(org.id, 'Bot', owner.id);
		const events: TournamentEvent[] = [];
		const unsubscribe = subscribe(tournament.id, (event) => events.push(event));

		const message = await postMessage(tournament, semi.id, { apiKeyName: 'Bot' }, 'Final is up');
		unsubscribe();
		expect(message).toMatchObject({ asOrganizer: true, author: null, apiKey: 'Bot' });
		expect(events).toEqual([{ type: 'chat', matchId: semi.id, message }]);
		expect(await listMessages(semi.id)).toEqual([message]);

		const [{ id }] = await listApiKeys(org.id);
		await revokeApiKey(org.id, id);
		expect((await listMessages(semi.id)).map((m) => m.apiKey)).toEqual(['Bot']);
	});

	it("doesn't find a match of another tournament", async () => {
		await start();
		let other = await createTournament(org.id, { name: 'Other', slug: 'other' });
		for (const name of ['q1', 'q2']) {
			await createUser(name);
			await addParticipant(other, name);
		}
		await setStatus(other, 'registration');
		other = (await getTournamentById(other.id))!;
		await startTournament(other);
		const [otherStage] = await getBracket(other.id);
		const foreign = otherStage.groups[0].matches[0];

		await expect(
			postMessage(tournament, foreign.id, { userId: owner.id, organizer: true }, 'hi')
		).rejects.toMatchObject({ kind: 'not_found' });
		expect(await listMessages(foreign.id)).toEqual([]);
	});
});

describe('match room', () => {
	/** The room's page data for the owner, a member who isn't playing. */
	async function room(matchId: string, trusted: boolean) {
		const event = {
			params: { org: 'club', tournament: 'cup', id: matchId },
			locals: { user: owner, session: null, trusted },
			url: new URL(`http://localhost/t/club/cup/matches/${matchId}`)
		};
		return loadRoom(event as unknown as Parameters<typeof loadRoom>[0]);
	}

	it('only gives organizer tools to members with a trusted session', async () => {
		await start();
		const semi = await match('M1-1');

		expect(await room(semi.id, false)).toMatchObject({
			side: null,
			organizer: false,
			canSet: false,
			canPost: false,
			canReport: false
		});
		expect(await room(semi.id, true)).toMatchObject({
			side: null,
			organizer: true,
			canSet: true,
			canPost: true
		});
	});
});

describe('live updates', () => {
	it('publishes changed matches and chat messages', async () => {
		const [p1] = await start();
		const semi = await match('M1-1');
		const events: TournamentEvent[] = [];
		const unsubscribe = subscribe(tournament.id, (event) => events.push(event));

		await reportResult(tournament, semi.id, p1.userId, [2, 0]);
		const message = await postMessage(
			tournament,
			semi.id,
			{ userId: p1.userId, organizer: false },
			'gg'
		);
		unsubscribe();

		expect(events).toEqual([
			{ type: 'matches', matchIds: [semi.id] },
			{ type: 'chat', matchId: semi.id, message }
		]);
	});
});
