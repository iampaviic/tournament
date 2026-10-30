import { asc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { STEAM_API_KEY } from '$app/env/private';
import { db } from '#lib/server/db/index.ts';
import { steamAppList, steamApps as steamAppTable, type SteamApp } from '#lib/server/db/schema.ts';
import type { Game } from '#lib/tournaments.ts';

/**
 * Steam's store apps, cached for the game picker. The list is fetched with the instance's key
 * (https://partner.steamgames.com/doc/webapi/IStoreService#GetAppList) once a day, when someone
 * searches, and the cache keeps serving while it refreshes or when Steam is down.
 */
const API = 'https://api.steampowered.com/IStoreService/GetAppList/v1/';
const LIST_ID = 'games';
/** The most apps Steam sends per page. */
const PAGE_SIZE = 50_000;
/** Steam has a few hundred thousand apps; this only stops a list that never ends. */
const MAX_PAGES = 20;
const MAX_AGE = 24 * 60 * 60 * 1000;
/** How long a refresh holds its claim: no other one starts, and a failed one isn't retried. */
const RETRY_AFTER = 10 * 60 * 1000;
/** Per request, in milliseconds. */
const TIMEOUT = 15_000;
const SEARCH_LIMIT = 10;
const BATCH_SIZE = 5000;
/** App ids are stored as `integer`. */
const MAX_APP_ID = 2 ** 31 - 1;

/** The 460×215 image Steam's store pages show for the app. */
export const steamHeaderImage = (appId: number) =>
	`https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;

const pageSchema = z.object({
	response: z.object({
		apps: z.array(z.object({ appid: z.int(), name: z.string() })),
		have_more_results: z.boolean().optional(),
		last_appid: z.int().optional()
	})
});

/** Every game on Steam, page by page in app id order. Throws when Steam fails or times out. */
export async function fetchSteamGames(
	apiKey: string,
	fetch: typeof globalThis.fetch,
	timeout = TIMEOUT
) {
	const games: { appId: number; name: string }[] = [];
	let lastAppId: number | undefined;
	for (let page = 0; page < MAX_PAGES; page++) {
		const query = new URLSearchParams({
			key: apiKey,
			include_games: 'true',
			include_dlc: 'false',
			include_software: 'false',
			include_videos: 'false',
			include_hardware: 'false',
			max_results: String(PAGE_SIZE)
		});
		if (lastAppId !== undefined) query.set('last_appid', String(lastAppId));
		// The URL has the key in it, so the errors never mention it.
		const response = await fetch(`${API}?${query}`, {
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(timeout)
		});
		if (!response.ok) throw new Error(`Steam answered ${response.status}.`);
		const parsed = pageSchema.safeParse(await response.json().catch(() => null));
		if (!parsed.success) throw new Error('Steam sent an app list we could not read.');

		const { apps, have_more_results, last_appid } = parsed.data.response;
		for (const app of apps) {
			const name = app.name.trim();
			if (name) games.push({ appId: app.appid, name });
		}
		if (!have_more_results || last_appid === undefined) break;
		if (lastAppId !== undefined && last_appid <= lastAppId) break;
		lastAppId = last_appid;
	}
	return games;
}

const toGame = (app: SteamApp): Game => ({
	appId: app.appId,
	name: app.name,
	headerImage: steamHeaderImage(app.appId)
});

/** `\`, `%` and `_` match themselves in a LIKE pattern. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

interface SteamAppsOptions {
	/** Without one the picker is off: nothing is fetched and nothing is found. */
	apiKey: string | undefined;
	fetch?: typeof globalThis.fetch;
	now?: () => Date;
	/** Per request, in milliseconds. */
	timeout?: number;
}

/** The Steam cache. Tests make their own, with a mock `fetch` and clock. */
export function createSteamApps({
	apiKey,
	fetch = (input, init) => globalThis.fetch(input, init),
	now = () => new Date(),
	timeout = TIMEOUT
}: SteamAppsOptions) {
	/** The refresh this process is running; callers share it. */
	let refreshing: Promise<void> | undefined;

	async function run(key: string) {
		try {
			// Other processes share the cache: whoever updates `attempted_at` first fetches.
			const started = now();
			const [claimed] = await db
				.insert(steamAppList)
				.values({ id: LIST_ID, attemptedAt: started })
				.onConflictDoUpdate({
					target: steamAppList.id,
					set: { attemptedAt: started },
					setWhere: or(
						isNull(steamAppList.attemptedAt),
						lt(steamAppList.attemptedAt, new Date(started.getTime() - RETRY_AFTER))
					)
				})
				.returning({ id: steamAppList.id });
			if (!claimed) return;

			const games = await fetchSteamGames(key, fetch, timeout);
			// Readers keep the old list until the new one is complete.
			await db.transaction(async (tx) => {
				await tx.delete(steamAppTable);
				for (let i = 0; i < games.length; i += BATCH_SIZE) {
					await tx
						.insert(steamAppTable)
						.values(games.slice(i, i + BATCH_SIZE))
						.onConflictDoNothing();
				}
				await tx
					.update(steamAppList)
					.set({ fetchedAt: now(), appCount: games.length })
					.where(eq(steamAppList.id, LIST_ID));
			});
		} catch (e) {
			console.error(
				`Couldn't refresh the Steam app list: ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}

	/**
	 * Fetches the list and replaces the cache, unless another refresh started less than 10 minutes
	 * ago. A failure is logged and keeps the old list. Never throws.
	 */
	function refresh(): Promise<void> {
		if (!apiKey) return Promise.resolve();
		refreshing ??= run(apiKey).finally(() => {
			refreshing = undefined;
		});
		return refreshing;
	}

	/** Refreshes a stale list: in the background while it has one, first when it never had one. */
	async function ensureFresh() {
		const [list] = await db
			.select({ fetchedAt: steamAppList.fetchedAt })
			.from(steamAppList)
			.where(eq(steamAppList.id, LIST_ID));
		const fetchedAt = list?.fetchedAt;
		if (fetchedAt && now().getTime() - fetchedAt.getTime() < MAX_AGE) return;
		if (fetchedAt) void refresh();
		else await refresh();
	}

	/** Up to 10 games whose name contains `query`: exact, prefix and word start matches first. */
	async function search(query: string): Promise<Game[]> {
		const q = query.trim().toLowerCase();
		if (!apiKey || !q) return [];
		await ensureFresh();
		const name = sql`lower(${steamAppTable.name})`;
		const escaped = escapeLike(q);
		const rows = await db
			.select()
			.from(steamAppTable)
			.where(sql`${name} like ${`%${escaped}%`}`)
			.orderBy(
				sql`case when ${name} = ${q} then 0 when ${name} like ${`${escaped}%`} then 1 when ${name} like ${`% ${escaped}%`} then 2 else 3 end`,
				sql`length(${steamAppTable.name})`,
				asc(steamAppTable.name),
				asc(steamAppTable.appId)
			)
			.limit(SEARCH_LIMIT);
		return rows.map(toGame);
	}

	/** The game with this app id, if Steam lists it. */
	async function find(appId: number): Promise<Game | undefined> {
		if (!apiKey || !Number.isInteger(appId) || appId < 1 || appId > MAX_APP_ID) return undefined;
		await ensureFresh();
		const [row] = await db.select().from(steamAppTable).where(eq(steamAppTable.appId, appId));
		return row && toGame(row);
	}

	return { enabled: Boolean(apiKey), search, find, refresh };
}

export type SteamApps = ReturnType<typeof createSteamApps>;

/** The instance's Steam cache. */
export const steamApps = createSteamApps({ apiKey: STEAM_API_KEY });
