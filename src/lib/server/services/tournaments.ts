import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import {
	organizations,
	participants,
	stages,
	tournamentRequirements,
	tournaments,
	type Tournament,
	type TournamentStatus
} from '#lib/server/db/schema.ts';
import { DEFAULT_STAGE_SETTINGS, structureSchema, type StageConfig } from '#lib/tournaments.ts';
import { isThemeEnabled } from '#lib/server/themes.ts';
import { ServiceError } from './errors';
import { orgSlugSchema } from './organizations';
import type { Requirement } from './requirements';

export const tournamentSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Name is required.')
		.max(80, 'Name must be at most 80 characters.'),
	slug: orgSlugSchema,
	description: z.string().trim().max(5000, 'Description must be at most 5000 characters.'),
	startsAt: z.date().nullable(),
	participantLimit: z
		.number()
		.int()
		.min(2, 'Allow at least 2 participants.')
		.max(1024, 'At most 1024 participants.')
		.nullable()
});
export type TournamentInput = z.infer<typeof tournamentSchema>;

/** Statuses in which the organizer can still change how the tournament will be played. */
const EDITABLE: TournamentStatus[] = ['draft', 'registration', 'check_in'];

export function assertEditable(tournament: Tournament) {
	if (!EDITABLE.includes(tournament.status)) {
		throw new ServiceError("This can't be changed after the tournament has started.");
	}
}

async function slugTaken(orgId: string, slug: string, exceptId?: string) {
	const [row] = await db
		.select({ id: tournaments.id })
		.from(tournaments)
		.where(
			and(
				eq(tournaments.orgId, orgId),
				eq(tournaments.slug, slug),
				exceptId ? ne(tournaments.id, exceptId) : undefined
			)
		);
	return Boolean(row);
}

/** Creates a draft tournament played as a single elimination bracket until configured otherwise. */
export async function createTournament(
	orgId: string,
	input: Pick<TournamentInput, 'name' | 'slug'>
) {
	if (await slugTaken(orgId, input.slug)) throw new ServiceError('That address is taken.');
	return db.transaction(async (tx) => {
		const [tournament] = await tx
			.insert(tournaments)
			.values({ orgId, ...input })
			.returning();
		await tx.insert(stages).values({
			tournamentId: tournament.id,
			index: 0,
			type: 'single_elimination',
			settings: DEFAULT_STAGE_SETTINGS
		});
		return tournament;
	});
}

export async function updateTournament(tournament: Tournament, input: TournamentInput) {
	if (await slugTaken(tournament.orgId, input.slug, tournament.id)) {
		throw new ServiceError('That address is taken.');
	}
	const [updated] = await db
		.update(tournaments)
		.set(input)
		.where(eq(tournaments.id, tournament.id))
		.returning();
	return updated;
}

/** Picks the bracket theme. It can be changed at any time, even while the tournament is played. */
export async function setTheme(tournament: Tournament, themeId: string) {
	if (!isThemeEnabled(themeId)) throw new ServiceError('That theme is not available.', 'invalid');
	await db.update(tournaments).set({ themeId }).where(eq(tournaments.id, tournament.id));
}

export async function deleteTournament(tournamentId: string) {
	await db.delete(tournaments).where(eq(tournaments.id, tournamentId));
}

/**
 * Deletes a tournament that hasn't been published. The REST API uses it: unlike the admin page, it
 * doesn't ask for the address to confirm.
 */
export async function deleteDraftTournament(tournament: Tournament) {
	if (tournament.status !== 'draft') {
		throw new ServiceError(
			'Only draft tournaments can be deleted here. Delete published ones from the admin page.'
		);
	}
	await deleteTournament(tournament.id);
}

export async function getTournament(orgSlug: string, slug: string) {
	const [row] = await db
		.select({ tournament: tournaments, org: organizations })
		.from(tournaments)
		.innerJoin(organizations, eq(tournaments.orgId, organizations.id))
		.where(
			and(eq(organizations.slug, orgSlug.toLowerCase()), eq(tournaments.slug, slug.toLowerCase()))
		);
	return row;
}

export async function getTournamentById(id: string) {
	const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
	return tournament;
}

const participantCount = sql<number>`(select count(*)::int from ${participants} where ${participants.tournamentId} = ${tournaments.id})`;

/** An organization's tournaments, newest first. Drafts only when `includeDrafts`. */
export async function listOrgTournaments(orgId: string, { includeDrafts = false } = {}) {
	return db
		.select({
			id: tournaments.id,
			slug: tournaments.slug,
			name: tournaments.name,
			status: tournaments.status,
			startsAt: tournaments.startsAt,
			participants: participantCount
		})
		.from(tournaments)
		.where(
			and(eq(tournaments.orgId, orgId), includeDrafts ? undefined : ne(tournaments.status, 'draft'))
		)
		.orderBy(desc(sql`coalesce(${tournaments.startsAt}, ${tournaments.createdAt})`));
}

/** Tournaments a user has signed up for, with the organization's address for links. */
export async function listUserTournaments(userId: string) {
	return db
		.select({
			slug: tournaments.slug,
			orgSlug: organizations.slug,
			name: tournaments.name,
			orgName: organizations.name,
			status: tournaments.status,
			startsAt: tournaments.startsAt,
			finalRank: participants.finalRank
		})
		.from(participants)
		.innerJoin(tournaments, eq(participants.tournamentId, tournaments.id))
		.innerJoin(organizations, eq(tournaments.orgId, organizations.id))
		.where(and(eq(participants.userId, userId), ne(tournaments.status, 'draft')))
		.orderBy(desc(sql`coalesce(${tournaments.startsAt}, ${tournaments.createdAt})`));
}

export async function getStructure(tournamentId: string) {
	return db
		.select()
		.from(stages)
		.where(eq(stages.tournamentId, tournamentId))
		.orderBy(asc(stages.index));
}

/** Replaces the stages. Only allowed before the tournament starts. */
export async function setStructure(tournament: Tournament, structure: StageConfig[]) {
	assertEditable(tournament);
	const parsed = structureSchema.safeParse(structure);
	if (!parsed.success) throw new ServiceError(parsed.error.issues[0].message, 'invalid');
	await db.transaction(async (tx) => {
		await tx.delete(stages).where(eq(stages.tournamentId, tournament.id));
		await tx.insert(stages).values(
			parsed.data.map((stage, index) => ({
				tournamentId: tournament.id,
				index,
				type: stage.type,
				settings: stage.settings
			}))
		);
	});
}

export async function getRequirements(tournamentId: string): Promise<Requirement[]> {
	return db
		.select({ moduleId: tournamentRequirements.moduleId, config: tournamentRequirements.config })
		.from(tournamentRequirements)
		.where(eq(tournamentRequirements.tournamentId, tournamentId))
		.orderBy(asc(tournamentRequirements.moduleId));
}

/** Replaces the auth modules participants must have linked. Only allowed before the start. */
export async function setRequirements(tournament: Tournament, requirements: Requirement[]) {
	assertEditable(tournament);
	await db.transaction(async (tx) => {
		await tx
			.delete(tournamentRequirements)
			.where(eq(tournamentRequirements.tournamentId, tournament.id));
		if (requirements.length) {
			await tx
				.insert(tournamentRequirements)
				.values(requirements.map((r) => ({ tournamentId: tournament.id, ...r })));
		}
	});
}

const TRANSITIONS: Partial<Record<TournamentStatus, TournamentStatus[]>> = {
	draft: ['registration'],
	registration: ['draft', 'check_in'],
	check_in: ['registration']
};

/**
 * Moves the tournament between the phases before it starts: publishing it, opening and closing
 * check-in. Starting it is `startTournament`.
 */
export async function setStatus(tournament: Tournament, status: TournamentStatus) {
	if (!TRANSITIONS[tournament.status]?.includes(status)) {
		throw new ServiceError(`A tournament can't go from ${tournament.status} to ${status}.`);
	}
	if (status === 'draft') {
		const [{ count }] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(participants)
			.where(eq(participants.tournamentId, tournament.id));
		if (count > 0) throw new ServiceError('Participants have already signed up.');
	}
	await db.update(tournaments).set({ status }).where(eq(tournaments.id, tournament.id));
}
