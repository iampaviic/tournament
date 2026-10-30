import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { users } from '#lib/server/db/schema.ts';
import { usernameSchema } from '#lib/server/auth/username.ts';

export const profileSchema = z.object({
	username: usernameSchema,
	displayName: z
		.string()
		.trim()
		.min(1, 'Display name is required.')
		.max(48, 'Display name must be at most 48 characters.'),
	bio: z.string().trim().max(500, 'Bio must be at most 500 characters.'),
	showResults: z.boolean(),
	showActivity: z.boolean()
});
export type ProfileInput = z.infer<typeof profileSchema>;

export async function getUserByUsername(username: string) {
	const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
	return user;
}

/** Returns `false` if the username is taken by someone else. */
export async function updateProfile(userId: string, input: ProfileInput) {
	const [taken] = await db
		.select({ id: users.id })
		.from(users)
		.where(and(eq(users.username, input.username), ne(users.id, userId)));
	if (taken) return false;
	await db.update(users).set(input).where(eq(users.id, userId));
	return true;
}
