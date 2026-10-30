import { and, asc, count, eq } from 'drizzle-orm';
import { db, type Transaction } from '#lib/server/db/index.ts';
import { identities, users, type Identity } from '#lib/server/db/schema.ts';
import type { AuthModule, ExternalIdentity } from '#lib/server/modules/types.ts';
import { usernameCandidates } from '#lib/server/auth/username.ts';
import { m } from '#lib/paraglide/messages.js';
import { ServiceError } from './errors';

/** A sign-in or account-linking failure whose message can be shown to the user. */
export class IdentityError extends ServiceError {
	override name = 'IdentityError';
}

const profile = (external: ExternalIdentity) => ({
	username: external.username,
	avatarUrl: external.avatarUrl ?? null,
	data: external.data,
	fetchedAt: new Date()
});

async function findIdentity(tx: Transaction, moduleId: string, providerUserId: string) {
	const [identity] = await tx
		.select()
		.from(identities)
		.where(and(eq(identities.moduleId, moduleId), eq(identities.providerUserId, providerUserId)));
	return identity as Identity | undefined;
}

async function pickUsername(tx: Transaction, base: string) {
	for (const candidate of usernameCandidates(base)) {
		const [taken] = await tx
			.select({ id: users.id })
			.from(users)
			.where(eq(users.username, candidate));
		if (!taken) return candidate;
	}
	throw new Error('unreachable');
}

/**
 * Signs in with an external identity: returns the user it is linked to, or creates a new user
 * for it. Updates the stored profile data either way.
 */
export async function signIn(moduleId: string, external: ExternalIdentity) {
	return db.transaction(async (tx) => {
		const existing = await findIdentity(tx, moduleId, external.providerUserId);
		if (existing) {
			await tx.update(identities).set(profile(external)).where(eq(identities.id, existing.id));
			return { userId: existing.userId, created: false };
		}

		const [user] = await tx
			.insert(users)
			.values({
				username: await pickUsername(tx, external.username),
				displayName: external.displayName ?? external.username,
				avatarUrl: external.avatarUrl ?? null
			})
			.returning({ id: users.id });
		await tx.insert(identities).values({
			userId: user.id,
			moduleId,
			providerUserId: external.providerUserId,
			...profile(external)
		});
		return { userId: user.id, created: true };
	});
}

/** Links an external identity to an existing user. */
export async function linkIdentity(userId: string, module: AuthModule, external: ExternalIdentity) {
	await db.transaction(async (tx) => {
		const existing = await findIdentity(tx, module.id, external.providerUserId);
		if (existing && existing.userId !== userId) {
			throw new IdentityError(m.identity_error_taken({ module: module.name }));
		}
		if (existing) {
			await tx.update(identities).set(profile(external)).where(eq(identities.id, existing.id));
			return;
		}

		const [other] = await tx
			.select({ id: identities.id })
			.from(identities)
			.where(and(eq(identities.userId, userId), eq(identities.moduleId, module.id)));
		if (other) {
			throw new IdentityError(m.identity_error_other({ module: module.name }));
		}
		await tx.insert(identities).values({
			userId,
			moduleId: module.id,
			providerUserId: external.providerUserId,
			...profile(external)
		});
	});
}

export async function listIdentities(userId: string) {
	return db
		.select()
		.from(identities)
		.where(eq(identities.userId, userId))
		.orderBy(asc(identities.createdAt));
}

/** Removes a linked identity. The last one cannot be removed, or the user could not sign in. */
export async function unlinkIdentity(userId: string, moduleId: string) {
	await db.transaction(async (tx) => {
		const [{ total }] = await tx
			.select({ total: count() })
			.from(identities)
			.where(eq(identities.userId, userId));
		if (total <= 1) throw new IdentityError(m.identity_error_last());
		await tx
			.delete(identities)
			.where(and(eq(identities.userId, userId), eq(identities.moduleId, moduleId)));
	});
}

/**
 * Re-fetches an identity's profile data from the platform.
 * Returns `false` when the data is still fresh and nothing was fetched.
 */
export async function refreshIdentity(userId: string, module: AuthModule, now = Date.now()) {
	if (!module.refreshProfile) {
		throw new IdentityError(m.identity_error_no_refresh({ module: module.name }));
	}
	const [identity] = await db
		.select()
		.from(identities)
		.where(and(eq(identities.userId, userId), eq(identities.moduleId, module.id)));
	if (!identity) throw new IdentityError(m.identity_error_not_linked({ module: module.name }));
	if (module.refreshInterval && now - identity.fetchedAt.getTime() < module.refreshInterval) {
		return false;
	}

	const external = await module.refreshProfile({
		...identity,
		avatarUrl: identity.avatarUrl ?? undefined
	});
	await db.update(identities).set(profile(external)).where(eq(identities.id, identity.id));
	return true;
}
