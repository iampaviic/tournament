import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { asc } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { steamAppList, steamApps } from '#lib/server/db/schema.ts';
import { mockFetch } from '#lib/server/testing/fetch.ts';
import { resetDatabase, seedSteamApps } from '#lib/server/testing/factories.ts';
import { createSteamApps, fetchSteamGames, steamHeaderImage } from './steam';

const STEAM = 'GET https://api.steampowered.com/IStoreService/GetAppList/v1/';
const T0 = new Date('2030-01-01T12:00:00Z');
const minutes = (n: number) => new Date(T0.getTime() + n * 60 * 1000);

/** A page of `GetAppList`; `more` is the `last_appid` of a page with more after it. */
const page = (apps: [number, string][], more?: number) => ({
	response: {
		apps: apps.map(([appid, name]) => ({ appid, name, last_modified: 0, price_change_number: 0 })),
		...(more === undefined ? {} : { have_more_results: true, last_appid: more })
	}
});

/** A cache with its own Steam and clock, set with `clock.now`. */
function setup(routes: Parameters<typeof mockFetch>[0], options: { timeout?: number } = {}) {
	const clock = { now: T0 };
	const { fetch, calls } = mockFetch(routes);
	const apps = createSteamApps({ apiKey: 'test-key', fetch, now: () => clock.now, ...options });
	return { apps, calls, clock };
}

/** A Steam whose answer waits until `release` is called. */
function gated(body: unknown) {
	let release!: () => void;
	const open = new Promise<void>((resolve) => (release = resolve));
	return { release, handler: () => open.then(() => body) };
}

const cached = async () =>
	(await db.select().from(steamApps).orderBy(asc(steamApps.appId))).map((app) => app.name);
const list = async () => (await db.select().from(steamAppList))[0];
const names = (games: { name: string }[]) => games.map((game) => game.name);

let errors: MockInstance<typeof console.error>;

beforeEach(async () => {
	await resetDatabase();
	errors = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	errors.mockRestore();
});

describe('fetching the list', () => {
	it('follows the pages of games and stores them', async () => {
		const { apps, calls } = setup({
			[STEAM]: (request: Request) =>
				new URL(request.url).searchParams.get('last_appid') === '20'
					? page([[30, 'Portal 2']])
					: page(
							[
								[10, 'Portal'],
								[15, ' '],
								[20, 'Tetris Effect']
							],
							20
						)
		});
		await apps.refresh();

		expect(calls).toHaveLength(2);
		const first = new URL(calls[0].url).searchParams;
		expect(Object.fromEntries(first)).toEqual({
			key: 'test-key',
			include_games: 'true',
			include_dlc: 'false',
			include_software: 'false',
			include_videos: 'false',
			include_hardware: 'false',
			max_results: '50000'
		});
		expect(new URL(calls[1].url).searchParams.get('last_appid')).toBe('20');
		expect(await cached()).toEqual(['Portal', 'Tetris Effect', 'Portal 2']);
		expect(await list()).toMatchObject({ fetchedAt: T0, attemptedAt: T0, appCount: 3 });
	});

	it("stops when the pages don't advance", async () => {
		const { fetch, calls } = mockFetch({ [STEAM]: () => page([[5, 'Loop']], 5) });
		expect(await fetchSteamGames('test-key', fetch)).toEqual([
			{ appId: 5, name: 'Loop' },
			{ appId: 5, name: 'Loop' }
		]);
		expect(calls).toHaveLength(2);
	});
});

describe('staleness', () => {
	it("doesn't fetch while the list is fresh", async () => {
		await seedSteamApps([{ appId: 620, name: 'Portal 2' }], minutes(-23 * 60));
		const { apps, calls } = setup({});
		expect(names(await apps.search('portal'))).toEqual(['Portal 2']);
		expect(calls).toHaveLength(0);
	});

	it('answers from a stale list while it refreshes in the background', async () => {
		await seedSteamApps([{ appId: 400, name: 'Portal' }], minutes(-25 * 60));
		const steam = gated(page([[620, 'Portal 2']]));
		const { apps, calls } = setup({ [STEAM]: steam.handler });

		expect(names(await apps.search('portal'))).toEqual(['Portal']);
		steam.release();
		await apps.refresh();
		expect(names(await apps.search('portal'))).toEqual(['Portal 2']);
		expect(calls).toHaveLength(1);
		expect(await list()).toMatchObject({ fetchedAt: T0, appCount: 1 });
	});

	it('waits for the first list', async () => {
		const { apps, calls } = setup({ [STEAM]: () => page([[620, 'Portal 2']]) });
		expect(names(await apps.search('portal'))).toEqual(['Portal 2']);
		expect(calls).toHaveLength(1);
	});
});

describe('failures', () => {
	const failures: [string, (request: Request) => unknown][] = [
		['an error status', () => new Response('Down', { status: 500 })],
		['an invalid body', () => ({ response: { apps: 'none' } })],
		['a body that is not JSON', () => new Response('<html>', { status: 200 })],
		[
			'a timeout',
			(request) =>
				new Promise((_, reject) =>
					request.signal.addEventListener('abort', () => reject(request.signal.reason))
				)
		]
	];

	it.each(failures)('keeps the old list after %s', async (_, handler) => {
		const fetchedAt = minutes(-25 * 60);
		await seedSteamApps([{ appId: 400, name: 'Portal' }], fetchedAt);
		const { apps, calls } = setup({ [STEAM]: handler }, { timeout: 20 });

		await apps.refresh();
		expect(calls).toHaveLength(1);
		expect(await cached()).toEqual(['Portal']);
		expect(await list()).toMatchObject({ fetchedAt, attemptedAt: T0, appCount: 1 });
		expect(errors).toHaveBeenCalledOnce();
		expect(String(errors.mock.calls[0][0])).not.toContain('test-key');
	});

	it('waits 10 minutes before trying again', async () => {
		await seedSteamApps([{ appId: 400, name: 'Portal' }], minutes(-25 * 60));
		const { apps, calls, clock } = setup({ [STEAM]: () => new Response(null, { status: 503 }) });

		await apps.refresh();
		clock.now = minutes(9);
		expect(names(await apps.search('portal'))).toEqual(['Portal']);
		await apps.refresh();
		expect(calls).toHaveLength(1);

		clock.now = minutes(11);
		await apps.refresh();
		expect(calls).toHaveLength(2);
	});
});

describe('concurrent refreshes', () => {
	it('share one fetch in a process', async () => {
		const { apps, calls } = setup({ [STEAM]: () => page([[620, 'Portal 2']]) });
		const [a, b] = await Promise.all([apps.search('portal'), apps.search('portal 2')]);
		expect(calls).toHaveLength(1);
		expect(names(a)).toEqual(['Portal 2']);
		expect(names(b)).toEqual(['Portal 2']);
	});

	it('fetch once across processes', async () => {
		const { fetch, calls } = mockFetch({ [STEAM]: () => page([[620, 'Portal 2']]) });
		const instance = () => createSteamApps({ apiKey: 'test-key', fetch, now: () => T0 });
		const [one, two] = [instance(), instance()];
		await Promise.all([one.search('portal'), two.search('portal')]);
		await Promise.all([one.refresh(), two.refresh()]);
		expect(calls).toHaveLength(1);
		expect(await cached()).toEqual(['Portal 2']);
	});
});

describe('search', () => {
	beforeEach(async () => {
		const apps: [number, string][] = [
			[1, 'Puyo Puyo Tetris'],
			[2, 'Tetris Effect'],
			[3, 'SuperTetris'],
			[4, 'Tetris'],
			[5, 'Tetris 99'],
			[6, 'Portal'],
			[7, '100% Orange Juice'],
			[8, '100 Orange'],
			[9, 'A_B'],
			[10, 'AxB'],
			...Array.from({ length: 12 }, (_, i): [number, string] => [20 + i, `Game ${i + 1}`])
		];
		await seedSteamApps(
			apps.map(([appId, name]) => ({ appId, name })),
			T0
		);
	});

	it('ranks exact, prefix, word start, then other matches', async () => {
		const { apps } = setup({});
		expect(names(await apps.search('  TETRIS '))).toEqual([
			'Tetris',
			'Tetris 99',
			'Tetris Effect',
			'Puyo Puyo Tetris',
			'SuperTetris'
		]);
	});

	it('matches % and _ literally', async () => {
		const { apps } = setup({});
		expect(names(await apps.search('100%'))).toEqual(['100% Orange Juice']);
		expect(names(await apps.search('a_b'))).toEqual(['A_B']);
	});

	it('finds at most 10 and nothing for an empty query', async () => {
		const { apps } = setup({});
		expect(await apps.search('game')).toHaveLength(10);
		expect(await apps.search('   ')).toEqual([]);
	});

	it('finds a game by app id, with its header image', async () => {
		const { apps } = setup({});
		const portal = {
			appId: 6,
			name: 'Portal',
			headerImage: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/6/header.jpg'
		};
		expect(await apps.find(6)).toEqual(portal);
		expect((await apps.search('portal'))[0]).toEqual(portal);
		expect(steamHeaderImage(6)).toBe(portal.headerImage);
		expect(await apps.find(404)).toBeUndefined();
		expect(await apps.find(2 ** 40)).toBeUndefined();
	});
});

describe('without a Steam API key', () => {
	it('finds nothing and never fetches', async () => {
		await seedSteamApps([{ appId: 620, name: 'Portal 2' }], null);
		const { fetch, calls } = mockFetch({});
		const apps = createSteamApps({ apiKey: undefined, fetch });
		expect(apps.enabled).toBe(false);
		expect(await apps.search('portal')).toEqual([]);
		expect(await apps.find(620)).toBeUndefined();
		await apps.refresh();
		expect(calls).toHaveLength(0);
	});
});
