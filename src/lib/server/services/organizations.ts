import { and, asc, count, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db, type Transaction } from '#lib/server/db/index.ts';
import { orgMembers, organizations, users, type OrgRole } from '#lib/server/db/schema.ts';
import { ServiceError } from './errors';

const ROLE_RANK: Record<OrgRole, number> = { admin: 1, owner: 2 };

/** Whether `role` grants at least the permissions of `required`. */
export function hasRole(role: OrgRole, required: OrgRole): boolean {
	return ROLE_RANK[role] >= ROLE_RANK[required];
}

export const orgSlugSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, 'Address must be at least 3 characters.')
	.max(40, 'Address must be at most 40 characters.')
	.regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		'Address may only contain lowercase letters, digits and single dashes.'
	);

export const organizationSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Name is required.')
		.max(64, 'Name must be at most 64 characters.'),
	slug: orgSlugSchema,
	description: z.string().trim().max(2000, 'Description must be at most 2000 characters.')
});
export type OrganizationInput = z.infer<typeof organizationSchema>;

export const roleSchema = z.enum(['owner', 'admin']);

const SLUG_TAKEN = 'That address is taken.';

async function slugTaken(slug: string, exceptId?: string) {
	const [row] = await db
		.select({ id: organizations.id })
		.from(organizations)
		.where(
			exceptId
				? and(eq(organizations.slug, slug), ne(organizations.id, exceptId))
				: eq(organizations.slug, slug)
		);
	return Boolean(row);
}

/** Creates an organization owned by `ownerId`. */
export async function createOrganization(ownerId: string, input: OrganizationInput) {
	if (await slugTaken(input.slug)) throw new ServiceError(SLUG_TAKEN);
	return db.transaction(async (tx) => {
		const [org] = await tx.insert(organizations).values(input).returning();
		await tx.insert(orgMembers).values({ orgId: org.id, userId: ownerId, role: 'owner' });
		return org;
	});
}

export async function updateOrganization(orgId: string, input: OrganizationInput) {
	if (await slugTaken(input.slug, orgId)) throw new ServiceError(SLUG_TAKEN);
	const [org] = await db
		.update(organizations)
		.set(input)
		.where(eq(organizations.id, orgId))
		.returning();
	return org;
}

export async function deleteOrganization(orgId: string) {
	await db.delete(organizations).where(eq(organizations.id, orgId));
}

export async function getOrganizationBySlug(slug: string) {
	const [org] = await db
		.select()
		.from(organizations)
		.where(eq(organizations.slug, slug.toLowerCase()));
	return org;
}

export async function getMemberRole(orgId: string, userId: string): Promise<OrgRole | null> {
	const [row] = await db
		.select({ role: orgMembers.role })
		.from(orgMembers)
		.where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
	return row?.role ?? null;
}

/** The organizations a user belongs to, with their role. */
export async function listUserOrganizations(userId: string) {
	return db
		.select({
			slug: organizations.slug,
			name: organizations.name,
			role: orgMembers.role
		})
		.from(orgMembers)
		.innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
		.where(eq(orgMembers.userId, userId))
		.orderBy(asc(organizations.name));
}

export async function listMembers(orgId: string) {
	return db
		.select({
			userId: users.id,
			username: users.username,
			displayName: users.displayName,
			avatarUrl: users.avatarUrl,
			role: orgMembers.role,
			joinedAt: orgMembers.createdAt
		})
		.from(orgMembers)
		.innerJoin(users, eq(orgMembers.userId, users.id))
		.where(eq(orgMembers.orgId, orgId))
		.orderBy(asc(orgMembers.createdAt));
}

export async function addMember(orgId: string, username: string, role: OrgRole) {
	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.username, username.trim().toLowerCase()));
	if (!user) throw new ServiceError(`There is no user called "${username}".`);
	if (await getMemberRole(orgId, user.id)) {
		throw new ServiceError(`${username} is already a member.`);
	}
	await db.insert(orgMembers).values({ orgId, userId: user.id, role });
}

/** Every organization keeps at least one owner, so it can always be managed. */
async function assertOtherOwner(tx: Transaction, orgId: string, userId: string) {
	const [{ owners }] = await tx
		.select({ owners: count() })
		.from(orgMembers)
		.where(
			and(eq(orgMembers.orgId, orgId), eq(orgMembers.role, 'owner'), ne(orgMembers.userId, userId))
		);
	if (owners === 0) throw new ServiceError('An organization needs at least one owner.');
}

export async function setMemberRole(orgId: string, userId: string, role: OrgRole) {
	await db.transaction(async (tx) => {
		if (role !== 'owner') await assertOtherOwner(tx, orgId, userId);
		await tx
			.update(orgMembers)
			.set({ role })
			.where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
	});
}

export async function removeMember(orgId: string, userId: string) {
	await db.transaction(async (tx) => {
		await assertOtherOwner(tx, orgId, userId);
		await tx
			.delete(orgMembers)
			.where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)));
	});
}
