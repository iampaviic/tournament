import { boolean, index, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	/** Lowercase handle used in URLs (`/u/[username]`). */
	username: text('username').notNull().unique(),
	displayName: text('display_name').notNull(),
	bio: text('bio').notNull().default(''),
	avatarUrl: text('avatar_url'),
	showResults: boolean('show_results').notNull().default(true),
	showActivity: boolean('show_activity').notNull().default(true),
	isInstanceAdmin: boolean('is_instance_admin').notNull().default(false),
	createdAt: createdAt()
});

/** An account on an external platform, linked through an auth module. */
export const identities = pgTable(
	'identities',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		moduleId: text('module_id').notNull(),
		providerUserId: text('provider_user_id').notNull(),
		username: text('username').notNull(),
		avatarUrl: text('avatar_url'),
		/** Module-specific profile data, e.g. a tetr.io rank. */
		data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
		createdAt: createdAt(),
		fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique().on(table.moduleId, table.providerUserId),
		unique().on(table.userId, table.moduleId)
	]
);

export const sessions = pgTable(
	'sessions',
	{
		/** SHA-256 hex digest of the session token; the token itself is only stored in the cookie. */
		id: text('id').primaryKey(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** The module the user signed in with. Decides whether the session is trusted. */
		authModuleId: text('auth_module_id').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: createdAt()
	},
	(table) => [index().on(table.userId)]
);

export type User = typeof users.$inferSelect;
export type Identity = typeof identities.$inferSelect;
export type Session = typeof sessions.$inferSelect;
