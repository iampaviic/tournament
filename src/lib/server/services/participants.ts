import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db, type Executor } from '#lib/server/db/index.ts';
import { identities, participants, users, type Tournament } from '#lib/server/db/schema.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import type { AuthModule } from '#lib/server/modules/types.ts';
import type { ThemeParticipant } from '#lib/themes/index.ts';
import { ServiceError } from './errors';
import { refreshIdentity } from './identities';
import { evaluateRequirements, type RequirementCheck } from './requirements';
import { getRequirements } from './tournaments';

/** Seeded participants first, then the rest in sign-up order. */
const seedOrder = [sql`${participants.seed} asc nulls last`, asc(participants.createdAt)];

export async function listParticipants(tournamentId: string, executor: Executor = db) {
	return executor
		.select({
			id: participants.id,
			userId: users.id,
			username: users.username,
			displayName: users.displayName,
			avatarUrl: users.avatarUrl,
			seed: participants.seed,
			checkedInAt: participants.checkedInAt,
			finalRank: participants.finalRank,
			createdAt: participants.createdAt
		})
		.from(participants)
		.innerJoin(users, eq(participants.userId, users.id))
		.where(eq(participants.tournamentId, tournamentId))
		.orderBy(...seedOrder);
}

/**
 * Participants as bracket themes see them, by participant id. `module` is the theme's auth module;
 * participants who linked it get its `bracketFields`.
 */
export async function bracketParticipants(
	tournamentId: string,
	module?: AuthModule
): Promise<Record<string, ThemeParticipant>> {
	const list = await listParticipants(tournamentId);
	const fields = new Map<string, Record<string, string>>();
	if (module?.bracketFields && list.length) {
		const rows = await db
			.select()
			.from(identities)
			.where(
				and(
					eq(identities.moduleId, module.id),
					inArray(
						identities.userId,
						list.map((p) => p.userId)
					)
				)
			);
		for (const row of rows) {
			fields.set(
				row.userId,
				module.bracketFields({ ...row, avatarUrl: row.avatarUrl ?? undefined })
			);
		}
	}
	return Object.fromEntries(
		list.map((p) => [
			p.id,
			{ id: p.id, name: p.displayName, avatarUrl: p.avatarUrl, fields: fields.get(p.userId) ?? {} }
		])
	);
}

export async function getParticipant(tournamentId: string, userId: string) {
	const [row] = await db
		.select()
		.from(participants)
		.where(and(eq(participants.tournamentId, tournamentId), eq(participants.userId, userId)));
	return row;
}

/** How a user's linked accounts measure up against each of the tournament's requirements. */
export async function checkRequirements(
	tournamentId: string,
	userIds: string[]
): Promise<Map<string, RequirementCheck[]>> {
	const requirements = await getRequirements(tournamentId);
	const linked = userIds.length
		? await db.select().from(identities).where(inArray(identities.userId, userIds))
		: [];
	return new Map(
		userIds.map((userId) => [
			userId,
			evaluateRequirements(
				requirements,
				linked
					.filter((i) => i.userId === userId)
					.map((i) => ({ ...i, avatarUrl: i.avatarUrl ?? undefined })),
				getModule
			)
		])
	);
}

/** Refreshes stale profile data the requirements depend on, e.g. a tetr.io rank. */
async function refreshRequiredIdentities(tournamentId: string, userId: string) {
	for (const { moduleId } of await getRequirements(tournamentId)) {
		const module = getModule(moduleId);
		if (!module?.refreshProfile || !module.checkEligibility) continue;
		try {
			await refreshIdentity(userId, module);
		} catch {
			// Not linked, or the platform is down: check against the data we have.
		}
	}
}

async function count(tournamentId: string) {
	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(participants)
		.where(eq(participants.tournamentId, tournamentId));
	return total;
}

/** Signs a user up, if registration is open and they meet every requirement. */
export async function register(tournament: Tournament, userId: string) {
	if (tournament.status !== 'registration') throw new ServiceError('Registration is closed.');
	if (await getParticipant(tournament.id, userId)) {
		throw new ServiceError("You're already registered.");
	}
	if (tournament.participantLimit && (await count(tournament.id)) >= tournament.participantLimit) {
		throw new ServiceError('The tournament is full.');
	}

	await refreshRequiredIdentities(tournament.id, userId);
	const checks = (await checkRequirements(tournament.id, [userId])).get(userId)!;
	for (const check of checks) {
		if (check.status === 'missing') {
			throw new ServiceError(`Link your ${check.moduleName} account to register.`);
		}
		if (check.status === 'ineligible') throw new ServiceError(check.reason);
		if (check.status === 'unavailable') {
			throw new ServiceError(
				`This tournament requires ${check.moduleName}, which is no longer available.`
			);
		}
	}
	await db.insert(participants).values({ tournamentId: tournament.id, userId });
}

export async function unregister(tournament: Tournament, userId: string) {
	if (tournament.status !== 'registration' && tournament.status !== 'check_in') {
		throw new ServiceError('You can no longer leave this tournament.');
	}
	await db
		.delete(participants)
		.where(and(eq(participants.tournamentId, tournament.id), eq(participants.userId, userId)));
}

export async function checkIn(tournament: Tournament, userId: string) {
	if (tournament.status !== 'check_in') throw new ServiceError('Check-in is not open.');
	const [row] = await db
		.update(participants)
		.set({ checkedInAt: new Date() })
		.where(and(eq(participants.tournamentId, tournament.id), eq(participants.userId, userId)))
		.returning({ id: participants.id });
	if (!row) throw new ServiceError("You aren't registered for this tournament.");
}

function assertNotStarted(tournament: Tournament) {
	if (tournament.status === 'running' || tournament.status === 'completed') {
		throw new ServiceError('The tournament has already started.');
	}
}

/** Organizer: adds a user without checking requirements or the participant limit. */
export async function addParticipant(tournament: Tournament, username: string) {
	assertNotStarted(tournament);
	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.username, username.trim().toLowerCase()));
	if (!user) throw new ServiceError(`There is no user called "${username}".`);
	if (await getParticipant(tournament.id, user.id)) {
		throw new ServiceError(`${username} is already registered.`);
	}
	await db.insert(participants).values({ tournamentId: tournament.id, userId: user.id });
}

export async function removeParticipant(tournament: Tournament, participantId: string) {
	assertNotStarted(tournament);
	await db
		.delete(participants)
		.where(and(eq(participants.tournamentId, tournament.id), eq(participants.id, participantId)));
}

export async function setCheckedIn(
	tournament: Tournament,
	participantId: string,
	checkedIn: boolean
) {
	assertNotStarted(tournament);
	await db
		.update(participants)
		.set({ checkedInAt: checkedIn ? new Date() : null })
		.where(and(eq(participants.tournamentId, tournament.id), eq(participants.id, participantId)));
}

/** Writes seeds 1…n in the given order. */
export async function writeSeeds(executor: Executor, tournamentId: string, order: string[]) {
	for (const [index, id] of order.entries()) {
		await executor
			.update(participants)
			.set({ seed: index + 1 })
			.where(and(eq(participants.tournamentId, tournamentId), eq(participants.id, id)));
	}
}

/** Moves a participant one place up (-1) or down (+1) in the seeding. */
export async function moveParticipant(tournament: Tournament, participantId: string, by: -1 | 1) {
	assertNotStarted(tournament);
	await db.transaction(async (tx) => {
		const order = (await listParticipants(tournament.id, tx)).map((p) => p.id);
		const from = order.indexOf(participantId);
		const to = from + by;
		if (from === -1 || to < 0 || to >= order.length) return;
		[order[from], order[to]] = [order[to], order[from]];
		await writeSeeds(tx, tournament.id, order);
	});
}

export async function shuffleSeeds(tournament: Tournament, random = Math.random) {
	assertNotStarted(tournament);
	await db.transaction(async (tx) => {
		const order = (await listParticipants(tournament.id, tx)).map((p) => p.id);
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(random() * (i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}
		await writeSeeds(tx, tournament.id, order);
	});
}

/**
 * The participants who will play, in seed order: everyone registered, or only those who checked in
 * if the tournament had a check-in phase.
 */
export async function playingParticipants(executor: Executor, tournament: Tournament) {
	return executor
		.select({ id: participants.id })
		.from(participants)
		.where(
			and(
				eq(participants.tournamentId, tournament.id),
				tournament.status === 'check_in' ? isNotNull(participants.checkedInAt) : undefined
			)
		)
		.orderBy(...seedOrder);
}
