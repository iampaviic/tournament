import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { steamAppList, steamApps, users } from '#lib/server/db/schema.ts';

/** Empties every table. Call it in `beforeEach` of database tests. */
export async function resetDatabase() {
	await db.execute(sql`TRUNCATE users, organizations, steam_apps, steam_app_list CASCADE`);
}

export async function createUser(username: string) {
	const [user] = await db.insert(users).values({ username, displayName: username }).returning();
	return user;
}

/** Fills the Steam cache as if it had been fetched at `fetchedAt` (`null`: never fetched). */
export async function seedSteamApps(
	apps: { appId: number; name: string }[],
	fetchedAt: Date | null = new Date()
) {
	if (apps.length) await db.insert(steamApps).values(apps);
	await db
		.insert(steamAppList)
		.values({ id: 'games', fetchedAt, appCount: apps.length })
		.onConflictDoUpdate({ target: steamAppList.id, set: { fetchedAt, appCount: apps.length } });
}
