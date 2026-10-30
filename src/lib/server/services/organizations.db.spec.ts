import { beforeEach, describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { requireOrgRole } from '#lib/server/auth/org.ts';
import type { User } from '#lib/server/db/schema.ts';
import { createUser, resetDatabase } from '#lib/server/testing/factories.ts';
import {
	addMember,
	createOrganization,
	deleteOrganization,
	getOrganizationBySlug,
	listMembers,
	listUserOrganizations,
	removeMember,
	setMemberRole,
	updateOrganization
} from './organizations';
import { createApiKey, listApiKeys, revokeApiKey, verifyApiKey } from './apiKeys';

const input = (slug: string) => ({ name: `Org ${slug}`, slug, description: '' });

let owner: User;
beforeEach(async () => {
	await resetDatabase();
	owner = await createUser('owner');
});

describe('organizations', () => {
	it('makes the creator the owner', async () => {
		const org = await createOrganization(owner.id, input('fertris'));
		expect(await listUserOrganizations(owner.id)).toEqual([
			{ id: org.id, slug: 'fertris', name: 'Org fertris', role: 'owner' }
		]);
		expect((await getOrganizationBySlug('FERTRIS'))?.id).toBe(org.id);
	});

	it('keeps addresses unique', async () => {
		const a = await createOrganization(owner.id, input('taken'));
		const b = await createOrganization(owner.id, input('free'));
		await expect(createOrganization(owner.id, input('taken'))).rejects.toThrow('taken');
		await expect(updateOrganization(b.id, input('taken'))).rejects.toThrow('taken');
		// Saving an organization with its own address is fine.
		await expect(updateOrganization(a.id, input('taken'))).resolves.toMatchObject({ id: a.id });
	});

	it('deletes members with the organization', async () => {
		const org = await createOrganization(owner.id, input('gone'));
		await deleteOrganization(org.id);
		expect(await listUserOrganizations(owner.id)).toEqual([]);
	});
});

describe('members', () => {
	it('adds members by username, once', async () => {
		const org = await createOrganization(owner.id, input('club'));
		await createUser('alice');
		await addMember(org.id, 'Alice', 'admin');
		expect((await listMembers(org.id)).map((m) => [m.username, m.role])).toEqual([
			['owner', 'owner'],
			['alice', 'admin']
		]);
		await expect(addMember(org.id, 'alice', 'admin')).rejects.toThrow('already a member');
		await expect(addMember(org.id, 'nobody', 'admin')).rejects.toThrow('no user called');
	});

	it('always keeps an owner', async () => {
		const org = await createOrganization(owner.id, input('club'));
		const alice = await createUser('alice');
		await addMember(org.id, 'alice', 'admin');

		await expect(setMemberRole(org.id, owner.id, 'admin')).rejects.toThrow('at least one owner');
		await expect(removeMember(org.id, owner.id)).rejects.toThrow('at least one owner');

		await setMemberRole(org.id, alice.id, 'owner');
		await setMemberRole(org.id, owner.id, 'admin');
		await removeMember(org.id, owner.id);
		expect((await listMembers(org.id)).map((m) => m.username)).toEqual(['alice']);
	});
});

describe('requireOrgRole', () => {
	const event = (user: User | null, trusted: boolean) => ({
		locals: { user, session: null, trusted },
		url: new URL('http://localhost/o/club/admin')
	});
	const status = async (promise: Promise<unknown>) => {
		try {
			await promise;
			return 200;
		} catch (e) {
			if (isHttpError(e)) return e.status;
			throw e;
		}
	};

	it('blocks untrusted sessions, non-members and admins doing owner things', async () => {
		await createOrganization(owner.id, input('club'));
		const alice = await createUser('alice');
		const bob = await createUser('bob');
		await addMember((await getOrganizationBySlug('club'))!.id, 'alice', 'admin');

		expect(await status(requireOrgRole(event(owner, false), 'club'))).toBe(403);
		expect(await status(requireOrgRole(event(bob, true), 'club'))).toBe(403);
		expect(await status(requireOrgRole(event(alice, true), 'club'))).toBe(200);
		expect(await status(requireOrgRole(event(alice, true), 'club', 'owner'))).toBe(403);
		expect(await status(requireOrgRole(event(owner, true), 'club', 'owner'))).toBe(200);
		expect(await status(requireOrgRole(event(owner, true), 'missing'))).toBe(404);
	});
});

describe('API keys', () => {
	it('verifies keys and records their use', async () => {
		const org = await createOrganization(owner.id, input('club'));
		const { key, prefix } = await createApiKey(org.id, 'Bot', owner.id);
		expect(key).toMatch(new RegExp(`^tm_${prefix}_[A-Za-z0-9_-]{43}$`));

		expect(await verifyApiKey(key)).toMatchObject({ orgId: org.id });
		const [listed] = await listApiKeys(org.id);
		expect(listed).toMatchObject({ name: 'Bot', prefix, createdBy: 'owner' });
		expect(listed.lastUsedAt).toBeInstanceOf(Date);
	});

	it('rejects tampered, malformed and revoked keys', async () => {
		const org = await createOrganization(owner.id, input('club'));
		const { key } = await createApiKey(org.id, 'Bot', owner.id);
		const tampered = key.slice(0, -1) + (key.endsWith('A') ? 'B' : 'A');

		expect(await verifyApiKey(tampered)).toBeNull();
		expect(await verifyApiKey('not-a-key')).toBeNull();

		const [{ id }] = await listApiKeys(org.id);
		await revokeApiKey(org.id, id);
		expect(await verifyApiKey(key)).toBeNull();
	});
});
