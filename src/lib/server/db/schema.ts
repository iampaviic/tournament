import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid
} from 'drizzle-orm/pg-core';
import type { MatchResult, MatchTemplate } from '#lib/brackets/index.ts';
import type { StageSettings } from '#lib/tournaments.ts';

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

/**
 * - `draft`: only organization admins can see it
 * - `registration`: public, and participants can sign up
 * - `check_in`: sign-ups are closed and registered participants confirm they will play
 * - `running`: stages are being played
 * - `completed`: the last stage is finished and final ranks are set
 */
export const tournamentStatus = pgEnum('tournament_status', [
	'draft',
	'registration',
	'check_in',
	'running',
	'completed'
]);

export const tournaments = pgTable(
	'tournaments',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		orgId: uuid('org_id')
			.notNull()
			.references(() => organizations.id, { onDelete: 'cascade' }),
		/** Used in URLs (`/t/[org]/[slug]`), unique within the organization. */
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		description: text('description').notNull().default(''),
		startsAt: timestamp('starts_at', { withTimezone: true }),
		/** Maximum number of participants, or `null` for no limit. */
		participantLimit: integer('participant_limit'),
		status: tournamentStatus('status').notNull().default('draft'),
		/** Bracket theme (M5). */
		themeId: text('theme_id').notNull().default('default'),
		createdAt: createdAt()
	},
	(table) => [unique().on(table.orgId, table.slug)]
);

/** An auth module participants must have linked to join, with the organizer's options for it. */
export const tournamentRequirements = pgTable(
	'tournament_requirements',
	{
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournaments.id, { onDelete: 'cascade' }),
		moduleId: text('module_id').notNull(),
		config: jsonb('config').$type<Record<string, unknown>>().notNull().default({})
	},
	(table) => [primaryKey({ columns: [table.tournamentId, table.moduleId] })]
);

export const participants = pgTable(
	'participants',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournaments.id, { onDelete: 'cascade' }),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** Set by the organizer; unseeded participants follow in sign-up order. */
		seed: integer('seed'),
		checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
		/** Set when the tournament is completed. */
		finalRank: integer('final_rank'),
		createdAt: createdAt()
	},
	(table) => [unique().on(table.tournamentId, table.userId), index().on(table.userId)]
);

export const stageType = pgEnum('stage_type', [
	'single_elimination',
	'double_elimination',
	'round_robin',
	'swiss'
]);

export const stageStatus = pgEnum('stage_status', ['pending', 'running', 'completed']);

/** A tournament has one or two stages: an optional group stage, then the final stage. */
export const stages = pgTable(
	'stages',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournaments.id, { onDelete: 'cascade' }),
		/** 0 for the first stage. */
		index: integer('index').notNull(),
		type: stageType('type').notNull(),
		settings: jsonb('settings').$type<StageSettings>().notNull(),
		status: stageStatus('status').notNull().default('pending'),
		/** Participant ids in each group, in seed order. Set when the stage starts. */
		groups: jsonb('groups').$type<string[][]>().notNull().default([])
	},
	(table) => [unique().on(table.tournamentId, table.index)]
);

export const matchStatus = pgEnum('match_status', [
	'waiting',
	'ready',
	'completed',
	'bye',
	'skipped'
]);

/**
 * A match as generated by the bracket engine. `template` and `result` are the source of truth;
 * the participant and status columns are derived from them (see `refreshStage`) for querying.
 */
export const matches = pgTable(
	'matches',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		stageId: uuid('stage_id')
			.notNull()
			.references(() => stages.id, { onDelete: 'cascade' }),
		groupIndex: integer('group_index').notNull(),
		templateId: text('template_id').notNull(),
		template: jsonb('template').$type<MatchTemplate>().notNull(),
		result: jsonb('result').$type<MatchResult>(),
		participant1Id: uuid('participant1_id'),
		participant2Id: uuid('participant2_id'),
		status: matchStatus('status').notNull().default('waiting'),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		unique().on(table.stageId, table.groupIndex, table.templateId),
		index().on(table.participant1Id),
		index().on(table.participant2Id)
	]
);

export type User = typeof users.$inferSelect;
export type Identity = typeof identities.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type OrgRole = (typeof orgRole.enumValues)[number];
export type ApiKey = typeof apiKeys.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentStatus = (typeof tournamentStatus.enumValues)[number];
export type Participant = typeof participants.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Match = typeof matches.$inferSelect;
