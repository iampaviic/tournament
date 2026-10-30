import { beforeEach, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	identities,
	matches,
	users,
	type Organization,
	type Tournament,
	type User
} from '#lib/server/db/schema.ts';
import { createUser, resetDatabase } from '#lib/server/testing/factories.ts';
import { DEFAULT_STAGE_SETTINGS, type StageConfig } from '#lib/tournaments.ts';
import { addMember, createOrganization } from './organizations';
import { addParticipant, listParticipants } from './participants';
import { setMatchResult } from './matches';
import { getProfile } from './profiles';
import { startTournament } from './stages';
import {
	createTournament,
	getStructure,
	getTournamentById,
	setStatus,
	setStructure
} from './tournaments';

let owner: User;
let org: Organization;

beforeEach(async () => {
	await resetDatabase();
	owner = await createUser('owner');
	org = await createOrganization(owner.id, { name: 'Club', slug: 'club', description: '' });
	for (let i = 1; i <= 4; i++) await createUser(`p${i}`);
});

const reload = async (tournament: Tournament) => (await getTournamentById(tournament.id))!;

/** A tournament with `players` (p1 seeded first) that is open for registration. */
async function open(slug: string, players: number, structure?: StageConfig[]) {
	const tournament = await createTournament(org.id, { name: slug, slug });
	if (structure) await setStructure(tournament, structure);
	for (let i = 1; i <= players; i++) await addParticipant(tournament, `p${i}`);
	await setStatus(tournament, 'registration');
	return reload(tournament);
}

async function started(slug: string, players: number, structure?: StageConfig[]) {
	const tournament = await open(slug, players, structure);
	await startTournament(tournament);
	return reload(tournament);
}

/** Plays every ready match until none is left; the better seed wins 2-1, or draws when `draws`. */
async function playAll(tournament: Tournament, { draws = false } = {}) {
	const seeds = new Map((await listParticipants(tournament.id)).map((p) => [p.id, p.seed!]));
	for (;;) {
		const stageIds = (await getStructure(tournament.id)).map((s) => s.id);
		const ready = await db
			.select()
			.from(matches)
			.where(and(inArray(matches.stageId, stageIds), eq(matches.status, 'ready')));
		if (!ready.length) return;
		for (const match of ready) {
			const better = seeds.get(match.participant1Id!)! < seeds.get(match.participant2Id!)!;
			await setMatchResult(tournament, match.id, draws ? [1, 1] : better ? [2, 1] : [1, 2], {
				userId: owner.id
			});
		}
	}
}

const results = async (username: string) => (await getProfile(username, null))!.results!;
const history = async (username: string) =>
	Object.fromEntries((await results(username)).map((t) => [t.slug, [t.finalRank, t.record]]));

describe('results', () => {
	it('gives the final rank and the record of a finished bracket', async () => {
		const tournament = await started('cup', 4);
		await playAll(tournament);
		expect(await history('p1')).toEqual({ cup: [1, { won: 2, drawn: 0, lost: 0 }] });
		expect(await history('p4')).toEqual({ cup: [3, { won: 0, drawn: 0, lost: 1 }] });
		const [cup] = await results('p1');
		expect(cup).toMatchObject({ orgSlug: 'club', orgName: 'Club', status: 'completed' });
		// Without a start time, the date is when it was created.
		expect(cup.date).toEqual(tournament.createdAt);
	});

	it("doesn't count byes", async () => {
		await playAll(await started('cup', 3));
		expect(await history('p1')).toEqual({ cup: [1, { won: 1, drawn: 0, lost: 0 }] });
	});

	it('counts draws in round robin', async () => {
		const structure = [{ type: 'round_robin' as const, settings: DEFAULT_STAGE_SETTINGS }];
		await playAll(await started('league', 3, structure), { draws: true });
		expect((await history('p1')).league[1]).toEqual({ won: 0, drawn: 2, lost: 0 });
	});

	it('lists running tournaments without a rank, and upcoming ones as activity', async () => {
		await started('running', 2);
		await open('next', 2);
		await createTournament(org.id, { name: 'Draft', slug: 'draft' });

		const profile = (await getProfile('p1', null))!;
		expect(profile.results!.map((t) => [t.slug, t.status, t.finalRank, t.record])).toEqual([
			['running', 'running', null, { won: 0, drawn: 0, lost: 0 }]
		]);
		expect(profile.activity!.tournaments).toEqual([
			{
				orgSlug: 'club',
				slug: 'next',
				name: 'next',
				status: 'registration',
				startsAt: null,
				detail: 'Club',
				game: null
			}
		]);
	});
});

describe('profile', () => {
	it('lists organizations with their role and leaves out dev logins', async () => {
		const p1 = (await db.select().from(users).where(eq(users.username, 'p1')))[0];
		await addMember(org.id, 'p1', 'admin');
		await db.insert(identities).values([
			{ userId: p1.id, moduleId: 'dev', providerUserId: 'p1', username: 'p1', data: {} },
			{ userId: p1.id, moduleId: 'tetrio', providerUserId: 't1', username: 'osk', data: {} }
		]);

		const profile = (await getProfile('P1', null))!;
		expect(profile.profile).toMatchObject({ username: 'p1', displayName: 'p1', bio: '' });
		expect(profile.activity!.organizations).toEqual([
			{ slug: 'club', name: 'Club', role: 'admin' }
		]);
		expect(profile.accounts).toEqual([{ module: 'tetrio', username: 'osk' }]);
	});

	it('hides results and activity from everyone but the owner', async () => {
		await started('cup', 2);
		await open('next', 2);
		await db
			.update(users)
			.set({ showResults: false, showActivity: false })
			.where(eq(users.username, 'p1'));
		const p1 = (await db.select().from(users).where(eq(users.username, 'p1')))[0];

		for (const viewer of [null, owner.id]) {
			const profile = (await getProfile('p1', viewer))!;
			expect(profile).toMatchObject({ isOwn: false, results: null, activity: null });
			expect(profile.visibility).toEqual({ results: false, activity: false });
		}

		const own = (await getProfile('p1', p1.id))!;
		expect(own.isOwn).toBe(true);
		expect(own.visibility).toEqual({ results: false, activity: false });
		expect(own.results!.map((t) => t.slug)).toEqual(['cup']);
		expect(own.activity!.tournaments.map((t) => t.slug)).toEqual(['next']);
	});

	it('is undefined for an unknown user', async () => {
		expect(await getProfile('nobody', null)).toBeUndefined();
	});
});
