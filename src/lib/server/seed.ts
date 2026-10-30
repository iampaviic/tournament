import type { Scores } from '#lib/matchReports.ts';
import type { Tournament } from '#lib/server/db/schema.ts';
import { resetDatabase } from '#lib/server/testing/factories.ts';
import { DEFAULT_STAGE_SETTINGS, type StageConfig, type StageSettings } from '#lib/tournaments.ts';
import { postMessage } from './services/chat.ts';
import { signIn } from './services/identities.ts';
import { listMatches, reportResult, requestHelp, setMatchResult } from './services/matches.ts';
import { createOrganization, getOrganizationBySlug } from './services/organizations.ts';
import { addParticipant, listParticipants } from './services/participants.ts';
import { getBracket, startNextStage, startTournament } from './services/stages.ts';
import { steamHeaderImage } from './services/steam.ts';
import {
	createTournament,
	getTournamentById,
	setStatus,
	setStructure,
	updateTournament
} from './services/tournaments.ts';

/**
 * Demo data for trying the app locally (`pnpm db:seed`): a club run by `mara`, sixteen players and a
 * tournament in every state, including a disputed match, a help request and match chat. Everyone
 * signs in through the dev module under their username.
 */

export const ORGANIZER = 'mara';
export const PLAYERS = [
	'kestrel',
	'nadia',
	'tomo',
	'vex',
	'lumi',
	'orsolya',
	'brick',
	'juno',
	'pavle',
	'sora',
	'ines',
	'rook',
	'mika',
	'dagny',
	'teo',
	'wren'
];
export const ORG_SLUG = 'kvart-gaming-club';

const DAY = 24 * 60 * 60 * 1000;
const SCORES: Scores[] = [
	[2, 1],
	[3, 0],
	[2, 0],
	[1, 2],
	[3, 2],
	[0, 2],
	[2, 1],
	[3, 1]
];
const game = (appId: number, name: string) => ({
	appId,
	name,
	headerImage: steamHeaderImage(appId)
});
const stage = (type: StageConfig['type'], settings: Partial<StageSettings> = {}): StageConfig => ({
	type,
	settings: { ...DEFAULT_STAGE_SETTINGS, ...settings }
});

/**
 * Adds the demo data, or returns `null` when the demo club is already there. With `reset`, empties
 * the whole database first.
 */
export async function seed({ reset = false, now = new Date() } = {}) {
	if (reset) await resetDatabase();
	else if (await getOrganizationBySlug(ORG_SLUG)) return null;

	const users: Record<string, string> = {};
	for (const username of [ORGANIZER, ...PLAYERS]) {
		// As the dev module signs them in, so signing in under the same name finds this user.
		const { userId } = await signIn('dev', { providerUserId: username, username, data: {} });
		users[username] = userId;
	}
	const organizer = { userId: users[ORGANIZER] };

	const org = await createOrganization(organizer.userId, {
		name: 'Kvart Gaming Club',
		slug: ORG_SLUG,
		description:
			'A neighbourhood club that runs weekly brackets and two big opens a year. Everyone plays, nobody waits around.'
	});

	async function tournament(
		name: string,
		slug: string,
		structure: StageConfig[],
		details: Partial<Parameters<typeof updateTournament>[1]> = {}
	) {
		let t = await createTournament(org.id, { name, slug });
		t = await updateTournament(t, {
			name,
			slug,
			description: '',
			startsAt: null,
			participantLimit: null,
			...details
		});
		await setStructure(t, structure);
		return t;
	}
	async function open(t: Tournament, players: string[]) {
		await setStatus(t, 'registration');
		const opened = (await getTournamentById(t.id))!;
		for (const username of players) await addParticipant(opened, username);
		return opened;
	}
	async function start(t: Tournament) {
		await startTournament(t);
		return (await getTournamentById(t.id))!;
	}
	/** The matches waiting for a result, in play order. */
	async function ready(t: Tournament) {
		const items = await listMatches(await getBracket(t.id));
		return items.filter((match) => match.progress === 'ready');
	}
	let played = 0;
	const result = (t: Tournament, matchId: string, scores = SCORES[played++ % SCORES.length]) =>
		setMatchResult(t, matchId, scores, organizer);
	async function playAll(t: Tournament) {
		for (let [match] = await ready(t); match; [match] = await ready(t)) await result(t, match.id);
	}
	/** Each participant's user, to report and chat as them. */
	async function userOf(t: Tournament) {
		const rows = await listParticipants(t.id);
		return (participantId: string | null | undefined) =>
			rows.find((row) => row.id === participantId)!.userId;
	}

	// Being played: double elimination with a dispute, a help request, a report and chat.
	let autumn = await tournament('Autumn Open', 'autumn-open', [stage('double_elimination')], {
		description:
			'Our autumn double elimination open. Lose twice and you are out. Best of three in every round, best of five in the grand final.',
		startsAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
		participantLimit: 16,
		game: game(1259790, 'Puyo Puyo Tetris 2')
	});
	autumn = await start(await open(autumn, PLAYERS.slice(0, 8)));
	for (const match of await ready(autumn)) await result(autumn, match.id);
	await result(autumn, (await ready(autumn))[0].id, [2, 1]);
	const user = await userOf(autumn);
	const [disputed, helped, reported] = await ready(autumn);
	await reportResult(autumn, disputed.id, user(disputed.entrants[0]), [2, 1]);
	await reportResult(autumn, disputed.id, user(disputed.entrants[1]), [1, 2]);
	const say = (matchId: string, userId: string, body: string, isOrganizer = false) =>
		postMessage(autumn, matchId, { userId, organizer: isOrganizer }, body);
	await say(disputed.id, user(disputed.entrants[0]), 'gg! I had it 2–1, game three was close');
	await say(
		disputed.id,
		user(disputed.entrants[1]),
		'I think you mixed up the games, I took the last two'
	);
	await say(
		disputed.id,
		user(disputed.entrants[0]),
		'ok, let us ask an organizer, I have the replay'
	);
	await say(
		disputed.id,
		organizer.userId,
		'Looking at it now. Please post the replay link here.',
		true
	);
	await requestHelp(autumn, helped.id, user(helped.entrants[0]));
	await say(
		helped.id,
		user(helped.entrants[0]),
		'My opponent has not shown up yet, can someone check?'
	);
	if (reported) await reportResult(autumn, reported.id, user(reported.entrants[0]), [2, 0]);

	// Being played: Swiss, one round in and a report waiting for confirmation.
	let swiss = await tournament('Weekly Swiss #14', 'weekly-swiss-14', [stage('swiss')], {
		description:
			'Three rounds of Swiss every Thursday evening. Drop in, play three games, go home.',
		startsAt: new Date(now.getTime() - 60 * 60 * 1000)
	});
	swiss = await start(await open(swiss, PLAYERS.slice(8, 14)));
	for (const match of await ready(swiss)) await result(swiss, match.id);
	const [second] = await ready(swiss);
	await reportResult(swiss, second.id, (await userOf(swiss))(second.entrants[0]), [2, 1]);

	// Finished: round robin groups, then a single elimination final day.
	let spring = await tournament(
		'Spring Cup',
		'spring-cup',
		[
			stage('round_robin', { groupCount: 2, advancePerGroup: 2 }),
			stage('single_elimination', { thirdPlaceMatch: true })
		],
		{
			description:
				'Two groups of four, then the top two of each play a single elimination final day.',
			startsAt: new Date(now.getTime() - 180 * DAY),
			game: game(1259790, 'Puyo Puyo Tetris 2')
		}
	);
	spring = await start(await open(spring, PLAYERS.slice(0, 8)));
	await playAll(spring);
	await startNextStage(spring);
	await playAll(spring);

	// Registration open, for an event six weeks away.
	const winter = await tournament(
		'Winter Invitational',
		'winter-invitational',
		[stage('swiss', { advancePerGroup: 4, swissRounds: 4 }), stage('double_elimination')],
		{
			description:
				'Four rounds of Swiss, then the top four play a double elimination final. Places are limited, so sign up early.',
			startsAt: new Date(now.getTime() + 42 * DAY),
			participantLimit: 32,
			game: game(252950, 'Rocket League')
		}
	);
	await open(winter, PLAYERS.slice(2, 13));

	// A draft only the club's members see.
	await tournament('Club Night #3', 'club-night-3', [stage('single_elimination')]);

	return { org: ORG_SLUG, organizer: ORGANIZER, player: PLAYERS[0] };
}
