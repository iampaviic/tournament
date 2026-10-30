import { beforeEach, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import {
	identities,
	matches,
	participants,
	steamApps,
	type Tournament,
	type User
} from '#lib/server/db/schema.ts';
import { tetrioModule } from '#lib/server/modules/auth/tetrio.ts';
import { mockFetch } from '#lib/server/testing/fetch.ts';
import { createUser, resetDatabase, seedSteamApps } from '#lib/server/testing/factories.ts';
import { DEFAULT_STAGE_SETTINGS, type StageConfig } from '#lib/tournaments.ts';
import { load as loadGeneral } from '../../../routes/t/[org]/[tournament]/admin/+page.server';
import { signIn } from './identities';
import { createOrganization } from './organizations';
import {
	addParticipant,
	bracketParticipants,
	checkIn,
	listParticipants,
	register,
	removeParticipant,
	setCheckedIn,
	setSeeds,
	unregister
} from './participants';
import { clearMatchResult, setMatchResult } from './matches';
import { getBracket, startNextStage, startTournament } from './stages';
import { createSteamApps, type SteamApps } from './steam';
import {
	createTournament,
	deleteDraftTournament,
	getStructure,
	getTournamentById,
	listOrgTournaments,
	listUserTournaments,
	setGame,
	setRequirements,
	setStatus,
	setStructure,
	setTheme
} from './tournaments';

let owner: User;
let tournament: Tournament;

beforeEach(async () => {
	await resetDatabase();
	owner = await createUser('owner');
	const org = await createOrganization(owner.id, { name: 'Club', slug: 'club', description: '' });
	tournament = await createTournament(org.id, { name: 'Cup', slug: 'cup' });
});

const reload = async () => (tournament = (await getTournamentById(tournament.id))!);

async function withPlayers(n: number) {
	for (let i = 1; i <= n; i++) {
		await createUser(`p${i}`);
		await addParticipant(tournament, `p${i}`);
	}
	return listParticipants(tournament.id);
}

const stage = (type: StageConfig['type'], settings: Partial<StageConfig['settings']> = {}) => ({
	type,
	settings: { ...DEFAULT_STAGE_SETTINGS, ...settings }
});

/** Plays every ready match until none is left; the better seed wins 2-1, or draws when `draws`. */
async function playAll({ draws = false } = {}) {
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

const ranks = async () =>
	Object.fromEntries(
		(await listParticipants(tournament.id)).map((p) => [p.displayName, p.finalRank])
	);

describe('tournament lifecycle', () => {
	it('starts as a draft single elimination', async () => {
		const structure = await getStructure(tournament.id);
		expect(structure.map((s) => [s.index, s.type, s.status])).toEqual([
			[0, 'single_elimination', 'pending']
		]);
		expect(tournament.status).toBe('draft');
	});

	it('plays a single elimination bracket to the end', async () => {
		await withPlayers(4);
		await setStatus(tournament, 'registration');
		await reload();
		await startTournament(tournament);
		await reload();
		expect(tournament.status).toBe('running');

		await playAll();
		await reload();
		expect(tournament.status).toBe('completed');
		expect(await ranks()).toEqual({ p1: 1, p2: 2, p3: 3, p4: 3 });
	});

	it('needs at least two participants', async () => {
		await withPlayers(1);
		await setStatus(tournament, 'registration');
		await reload();
		await expect(startTournament(tournament)).rejects.toThrow('At least two');
	});

	it('only starts from registration or check-in', async () => {
		await withPlayers(2);
		await expect(startTournament(tournament)).rejects.toThrow('Open registration');
	});

	it("leaves out participants who didn't check in", async () => {
		const players = await withPlayers(3);
		await setStatus(tournament, 'registration');
		await reload();
		await setStatus(tournament, 'check_in');
		await reload();
		await setCheckedIn(tournament, players[0].id, true);
		await setCheckedIn(tournament, players[2].id, true);
		await startTournament(tournament);
		expect((await listParticipants(tournament.id)).map((p) => [p.displayName, p.seed])).toEqual([
			['p1', 1],
			['p3', 2]
		]);
	});

	it('locks the structure once started', async () => {
		await withPlayers(2);
		await setStatus(tournament, 'registration');
		await reload();
		await startTournament(tournament);
		await reload();
		await expect(setStructure(tournament, [stage('swiss')])).rejects.toThrow(
			'after the tournament has started'
		);
		await expect(setRequirements(tournament, [])).rejects.toThrow(
			'after the tournament has started'
		);
		await expect(setStructure(tournament, [stage('swiss')])).rejects.toMatchObject({
			kind: 'conflict'
		});
	});

	it('only deletes drafts without confirmation', async () => {
		const draft = await createTournament(tournament.orgId, { name: 'Draft', slug: 'draft' });
		await deleteDraftTournament(draft);
		expect(await getTournamentById(draft.id)).toBeUndefined();

		await setStatus(tournament, 'registration');
		await reload();
		await expect(deleteDraftTournament(tournament)).rejects.toMatchObject({ kind: 'conflict' });
		expect(await getTournamentById(tournament.id)).toBeDefined();
	});
});

describe('participants', () => {
	it('seeds the participants in the given order', async () => {
		const [p1, p2, p3] = await withPlayers(3);
		await setSeeds(tournament, [p3.id, p1.id, p2.id]);
		expect((await listParticipants(tournament.id)).map((p) => [p.displayName, p.seed])).toEqual([
			['p3', 1],
			['p1', 2],
			['p2', 3]
		]);

		await expect(setSeeds(tournament, [p1.id, p2.id])).rejects.toMatchObject({ kind: 'invalid' });
		await expect(setSeeds(tournament, [p1.id, p1.id, p2.id])).rejects.toMatchObject({
			kind: 'invalid'
		});

		await setStatus(tournament, 'registration');
		await reload();
		await startTournament(tournament);
		await reload();
		await expect(setSeeds(tournament, [p1.id, p2.id, p3.id])).rejects.toThrow('already started');
	});

	it('tells unknown participants and users apart from phase errors', async () => {
		await expect(removeParticipant(tournament, crypto.randomUUID())).rejects.toMatchObject({
			kind: 'not_found'
		});
		await expect(setCheckedIn(tournament, crypto.randomUUID(), true)).rejects.toMatchObject({
			kind: 'not_found'
		});
		await expect(addParticipant(tournament, 'nobody')).rejects.toMatchObject({
			kind: 'invalid'
		});
	});
});

describe('two stages', () => {
	it('plays round robin groups, advances the top two, and finishes with playoffs', async () => {
		await setStructure(tournament, [
			stage('round_robin', {
				groupCount: 2,
				advancePerGroup: 2,
				scoring: { win: 3, draw: 1, loss: 0 }
			}),
			stage('single_elimination', { thirdPlaceMatch: true })
		]);
		await withPlayers(8);
		await setStatus(tournament, 'registration');
		await reload();
		await startTournament(tournament);
		await reload();

		const [groupStage] = await getStructure(tournament.id);
		// Snake seeding: seeds 1, 4, 5, 8 in group A and 2, 3, 6, 7 in group B.
		const names = new Map(
			(await listParticipants(tournament.id)).map((p) => [p.id, p.displayName])
		);
		expect(groupStage.groups.map((g) => g.map((id) => names.get(id)))).toEqual([
			['p1', 'p4', 'p5', 'p8'],
			['p2', 'p3', 'p6', 'p7']
		]);

		await playAll();
		await expect(startNextStage(tournament)).resolves.toBeUndefined();
		const bracket = await getBracket(tournament.id);
		expect(bracket[0].status).toBe('completed');
		const firstRound = bracket[1].groups[0].matches
			.filter((m) => m.template.side === 'main' && m.template.round === 1)
			.map((m) => m.entrants.map((id) => names.get(id!)));
		// Group winners meet the other group's runner-up.
		expect(firstRound).toEqual([
			['p1', 'p3'],
			['p2', 'p4']
		]);

		await playAll();
		await reload();
		expect(tournament.status).toBe('completed');
		expect(await ranks()).toEqual({ p1: 1, p2: 2, p3: 3, p4: 4, p5: 5, p6: 5, p7: 7, p8: 7 });
	});

	it("won't start the next stage before the current one is done", async () => {
		await setStructure(tournament, [
			stage('round_robin', { advancePerGroup: 2 }),
			stage('single_elimination')
		]);
		await withPlayers(3);
		await setStatus(tournament, 'registration');
		await reload();
		await startTournament(tournament);
		await expect(startNextStage(tournament)).rejects.toThrow('Finish every match');
	});

	it('checks that enough participants can advance', async () => {
		await setStructure(tournament, [
			stage('round_robin', { groupCount: 2, advancePerGroup: 3 }),
			stage('single_elimination')
		]);
		await withPlayers(4);
		await setStatus(tournament, 'registration');
		await reload();
		await expect(startTournament(tournament)).rejects.toThrow("3 can't advance from a group of 2");
	});
});

describe('results', () => {
	async function startWith(structure: StageConfig[], players: number) {
		await setStructure(tournament, structure);
		await withPlayers(players);
		await setStatus(tournament, 'registration');
		await reload();
		await startTournament(tournament);
		await reload();
		return getBracket(tournament.id);
	}

	it('pairs Swiss rounds as the previous one finishes', async () => {
		await startWith([stage('swiss', { swissRounds: 3 })], 6);
		await playAll({ draws: true });
		const rounds = (await getBracket(tournament.id))[0].groups[0].matches.map(
			(m) => m.template.round
		);
		expect(Math.max(...rounds)).toBe(3);
		await reload();
		expect(tournament.status).toBe('completed');
	});

	it('rejects draws in elimination matches', async () => {
		const [stage0] = await startWith([stage('single_elimination')], 2);
		await expect(
			setMatchResult(tournament, stage0.groups[0].matches[0].id, [1, 1], { userId: owner.id })
		).rejects.toThrow('need a winner');
	});

	it('discards later results when an earlier one is corrected', async () => {
		const [stage0] = await startWith([stage('single_elimination')], 4);
		const [semi1, semi2, final] = stage0.groups[0].matches;
		await setMatchResult(tournament, semi1.id, [2, 0], { userId: owner.id });
		await setMatchResult(tournament, semi2.id, [2, 0], { userId: owner.id });
		await setMatchResult(tournament, final.id, [2, 1], { userId: owner.id });
		await reload();
		expect(tournament.status).toBe('completed');

		// A completed tournament is final.
		await expect(
			setMatchResult(tournament, semi1.id, [0, 2], { userId: owner.id })
		).rejects.toThrow('while the stage');
	});

	it('clears a result and anything that depended on it', async () => {
		const [stage0] = await startWith([stage('single_elimination')], 8);
		const quarter = stage0.groups[0].matches[0];
		await setMatchResult(tournament, quarter.id, [2, 0], { userId: owner.id });
		await setMatchResult(tournament, stage0.groups[0].matches[1].id, [2, 0], { userId: owner.id });
		const semi = (await getBracket(tournament.id))[0].groups[0].matches.find(
			(m) => m.template.id === 'M2-1'
		)!;
		await setMatchResult(tournament, semi.id, [2, 0], { userId: owner.id });

		await setMatchResult(tournament, quarter.id, [0, 2], { userId: owner.id });
		const after = (await getBracket(tournament.id))[0].groups[0].matches.find(
			(m) => m.template.id === 'M2-1'
		)!;
		expect(after.status).toBe('ready');
		expect(after.result).toBeNull();

		await clearMatchResult(tournament, quarter.id);
		const cleared = (await getBracket(tournament.id))[0].groups[0].matches.find(
			(m) => m.template.id === 'M2-1'
		)!;
		expect(cleared.status).toBe('waiting');
	});

	it('ignores matches from other tournaments', async () => {
		const [stage0] = await startWith([stage('single_elimination')], 2);
		const other = await createTournament(tournament.orgId, { name: 'Other', slug: 'other' });
		await expect(
			setMatchResult(other, stage0.groups[0].matches[0].id, [1, 0], { userId: owner.id })
		).rejects.toThrow('Match not found');
	});
});

describe('registration', () => {
	beforeEach(async () => {
		await setStatus(tournament, 'registration');
		await reload();
	});

	it('signs users up once, until the tournament is full', async () => {
		const { userId } = await signIn('dev', { providerUserId: 'a', username: 'a', data: {} });
		await register(tournament, userId);
		await expect(register(tournament, userId)).rejects.toThrow('already registered');

		tournament = { ...tournament, participantLimit: 1 };
		const other = await signIn('dev', { providerUserId: 'b', username: 'b', data: {} });
		await expect(register(tournament, other.userId)).rejects.toThrow('full');
	});

	it('requires the linked accounts the tournament asks for', async () => {
		const user = await createUser('nolink');
		await setRequirements(tournament, [{ moduleId: 'dev', config: {} }]);
		await expect(register(tournament, user.id)).rejects.toThrow(
			'Link your Development login account'
		);

		const linked = await signIn('dev', { providerUserId: 'c', username: 'c', data: {} });
		await expect(register(tournament, linked.userId)).resolves.toBeUndefined();

		await setRequirements(tournament, [{ moduleId: 'steam', config: {} }]);
		const another = await signIn('dev', { providerUserId: 'd', username: 'd', data: {} });
		await expect(register(tournament, another.userId)).rejects.toThrow('no longer available');
	});

	it('handles check-in and leaving', async () => {
		const { userId } = await signIn('dev', { providerUserId: 'e', username: 'e', data: {} });
		await register(tournament, userId);
		await expect(checkIn(tournament, userId)).rejects.toThrow('Check-in is not open');

		await setStatus(tournament, 'check_in');
		await reload();
		await expect(register(tournament, userId)).rejects.toThrow('Registration is closed');
		await checkIn(tournament, userId);
		const [row] = await db.select().from(participants).where(eq(participants.userId, userId));
		expect(row.checkedInAt).toBeInstanceOf(Date);

		await unregister(tournament, userId);
		expect(await listParticipants(tournament.id)).toEqual([]);
	});

	it("can't go back to draft once people signed up", async () => {
		const { userId } = await signIn('dev', { providerUserId: 'f', username: 'f', data: {} });
		await register(tournament, userId);
		await expect(setStatus(tournament, 'draft')).rejects.toThrow('already signed up');
	});
});

describe('bracket themes', () => {
	it('switches themes, but only to installed ones', async () => {
		await setTheme(tournament, 'tetrio');
		expect((await reload()).themeId).toBe('tetrio');
		await expect(setTheme(tournament, 'retro')).rejects.toThrow('not available');
		expect((await reload()).themeId).toBe('tetrio');
	});

	it("gives themes the fields of their module's linked accounts", async () => {
		const [ranked, other] = await withPlayers(2);
		await db.insert(identities).values({
			userId: ranked.userId,
			moduleId: 'tetrio',
			providerUserId: 't1',
			username: 'osk',
			data: { rank: 'x', tr: 24321.4, country: 'HR' }
		});
		const tetrio = tetrioModule({ clientId: 'x', clientSecret: 'y' });

		const shown = await bracketParticipants(tournament.id, tetrio);
		expect(shown[ranked.id]).toEqual({
			id: ranked.id,
			name: 'p1',
			avatarUrl: null,
			fields: { rank: 'X', tr: '24,321', country: 'HR' }
		});
		expect(shown[other.id].fields).toEqual({});
		expect((await bracketParticipants(tournament.id))[ranked.id].fields).toEqual({});
	});
});

describe('game', () => {
	const portal = {
		appId: 400,
		name: 'Portal',
		headerImage: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/400/header.jpg'
	};
	let apps: SteamApps;

	beforeEach(async () => {
		await seedSteamApps([
			{ appId: 400, name: 'Portal' },
			{ appId: 620, name: 'Portal 2' }
		]);
		apps = createSteamApps({ apiKey: 'test', fetch: mockFetch({}).fetch });
	});

	it('stores the picked game', async () => {
		expect((await setGame(tournament, 400, apps)).game).toEqual(portal);
		expect((await reload()).game).toEqual(portal);
	});

	it('keeps the current game without looking it up', async () => {
		await setGame(tournament, 400, apps);
		await reload();
		await db.delete(steamApps);
		expect((await setGame(tournament, 400, apps)).game).toEqual(portal);
		expect((await setGame(tournament, 400, createSteamApps({ apiKey: undefined }))).game).toEqual(
			portal
		);
		await expect(setGame(tournament, 620, apps)).rejects.toMatchObject({ kind: 'invalid' });
	});

	it('rejects unknown games, and any game without a Steam API key', async () => {
		await expect(setGame(tournament, 999, apps)).rejects.toMatchObject({
			kind: 'invalid',
			message: "That Steam game wasn't found."
		});
		await expect(
			setGame(tournament, 400, createSteamApps({ apiKey: undefined }))
		).rejects.toMatchObject({
			kind: 'invalid',
			message: "Steam games aren't enabled on this instance."
		});
		expect((await reload()).game).toBeNull();
	});

	it('clears the game', async () => {
		await setGame(tournament, 400, apps);
		await reload();
		expect((await setGame(tournament, null, apps)).game).toBeNull();
		expect((await reload()).game).toBeNull();
	});

	it('hides the picker without a Steam API key, and still shows the stored game', async () => {
		await setGame(tournament, 400, apps);
		// The tests run without a key, so the General tab's own Steam cache is off.
		const event = {
			params: { org: 'club', tournament: 'cup' },
			locals: { user: owner, session: null, trusted: true },
			url: new URL('http://localhost/t/club/cup/admin?game=portal')
		};
		expect(await loadGeneral(event as unknown as Parameters<typeof loadGeneral>[0])).toMatchObject({
			game: portal,
			steam: null
		});
	});

	it('shows the game in tournament lists', async () => {
		await setGame(tournament, 620, apps);
		await setStatus(tournament, 'registration');
		await reload();
		const fan = await createUser('fan');
		await addParticipant(tournament, 'fan');

		const [listed] = await listOrgTournaments(tournament.orgId);
		expect(listed.game).toMatchObject({ appId: 620, name: 'Portal 2' });
		const [joined] = await listUserTournaments(fan.id);
		expect(joined).toMatchObject({
			game: { appId: 620, name: 'Portal 2' },
			participantId: expect.any(String),
			createdAt: tournament.createdAt
		});
	});
});
