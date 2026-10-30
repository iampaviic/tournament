import {
	boolean,
	index,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';

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

export const organizations = pgTable('organizations', {
	id: uuid('id').primaryKey().defaultRandom(),
	/** Used in URLs (`/o/[slug]`). */
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description').notNull().default(''),
	createdAt: createdAt()
});

/** Owners can do everything; admins can do everything except manage members and delete the organization. */
export const orgRole = pgEnum('org_role', ['owner', 'admin']);

export const orgMembers = pgTable(
	'org_members',
	{
		orgId: uuid('org_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		role: orgRole('role').notNull(),
		createdAt: createdAt()
	},
	(table) => [primaryKey({ columns: [table.orgId, table.userId] }), index().on(table.userId)]
);

/** Organization-scoped REST API keys. Only the hash is stored; the key is shown once. */
export const apiKeys = pgTable(
	'api_keys',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orgId: uuid('org_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		/** Public part of the key, used to look it up and to tell keys apart in the UI. */
		prefix: text('prefix').notNull().unique(),
		/** SHA-256 hex digest of the whole key. */
		hash: text('hash').notNull(),
		createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		lastUsedAt: timestamp('last_used_at', { withTimezone: true })
	},
	(table) => [index().on(table.orgId)]
);

export type User = typeof users.$inferSelect;
export type Identity = typeof identities.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrgRole = (typeof orgRole.enumValues)[number];
export type ApiKey = typeof apiKeys.$inferSelect;
