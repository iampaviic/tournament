import { beforeEach, describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import type { Organization, User } from '#lib/server/db/schema.ts';
import {
	createApiKey,
	listApiKeys,
	revokeApiKey,
	verifyApiKey
} from '#lib/server/services/apiKeys.ts';
import { createOrganization } from '#lib/server/services/organizations.ts';
import { createTournament } from '#lib/server/services/tournaments.ts';
import { createUser, resetDatabase } from '#lib/server/testing/factories.ts';
import { requireApiKey, requireApiTournament } from './apiKey';

const event = (authorization?: string) => ({
	request: new Request('http://localhost/api/v1/tournaments', {
		headers: authorization ? { authorization } : {}
	})
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

let owner: User;
let org: Organization;
beforeEach(async () => {
	await resetDatabase();
	owner = await createUser('owner');
	org = await createOrganization(owner.id, { name: 'Club', slug: 'club', description: '' });
});

describe('requireApiKey', () => {
	it('accepts a valid key of the organization', async () => {
		const { key } = await createApiKey(org.id, 'Bot', owner.id);
		expect(await requireApiKey(event(`Bearer ${key}`))).toMatchObject({
			orgId: org.id,
			name: 'Bot'
		});
	});

	it('rejects missing, malformed, wrong and revoked keys', async () => {
		const { key } = await createApiKey(org.id, 'Bot', owner.id);
		const tampered = key.slice(0, -1) + (key.endsWith('A') ? 'B' : 'A');

		expect(await status(requireApiKey(event()))).toBe(401);
		expect(await status(requireApiKey(event('Basic abc')))).toBe(401);
		expect(await status(requireApiKey(event('Bearer nope')))).toBe(401);
		expect(await status(requireApiKey(event(`Bearer ${tampered}`)))).toBe(401);

		const [{ id }] = await listApiKeys(org.id);
		await revokeApiKey(org.id, id);
		expect(await status(requireApiKey(event(`Bearer ${key}`)))).toBe(401);
	});

	it('records the use at most once a minute', async () => {
		const { key } = await createApiKey(org.id, 'Bot', owner.id);
		const t0 = new Date('2030-01-01T12:00:00Z');
		const lastUsed = async () => (await listApiKeys(org.id))[0].lastUsedAt;

		await verifyApiKey(key, t0);
		expect(await lastUsed()).toEqual(t0);
		await verifyApiKey(key, new Date(t0.getTime() + 30_000));
		expect(await lastUsed()).toEqual(t0);
		await verifyApiKey(key, new Date(t0.getTime() + 60_000));
		expect(await lastUsed()).toEqual(new Date(t0.getTime() + 60_000));
	});
});

describe('requireApiTournament', () => {
	it("finds the organization's tournaments and nobody else's", async () => {
		const other = await createOrganization(owner.id, {
			name: 'Other',
			slug: 'other',
			description: ''
		});
		const own = await createTournament(org.id, { name: 'Cup', slug: 'cup' });
		const foreign = await createTournament(other.id, { name: 'Cup', slug: 'cup' });
		const key = (await verifyApiKey((await createApiKey(org.id, 'Bot', owner.id)).key))!;

		expect((await requireApiTournament(key, own.id)).id).toBe(own.id);
		expect(await status(requireApiTournament(key, foreign.id))).toBe(404);
		expect(await status(requireApiTournament(key, crypto.randomUUID()))).toBe(404);
	});
});
