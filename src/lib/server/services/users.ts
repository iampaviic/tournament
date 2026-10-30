import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { users } from '#lib/server/db/schema.ts';
import { usernameSchema } from '#lib/server/auth/username.ts';
import { m } from '#lib/paraglide/messages.js';

export const profileSchema = z.object({
	username: usernameSchema,
	displayName: z
		.string()
		.trim()
		.min(1, { error: () => m.validation_display_name_required() })
		.max(48, { error: () => m.validation_display_name_max({ max: 48 }) }),
	bio: z
		.string()
		.trim()
		.max(500, { error: () => m.validation_bio_max({ max: 500 }) }),
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
