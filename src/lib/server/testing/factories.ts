import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { users } from '#lib/server/db/schema.ts';

/** Empties every table. Call it in `beforeEach` of database tests. */
export async function resetDatabase() {
	await db.execute(sql`TRUNCATE users, organizations CASCADE`);
}

export async function createUser(username: string) {
	const [user] = await db.insert(users).values({ username, displayName: username }).returning();
	return user;
}
