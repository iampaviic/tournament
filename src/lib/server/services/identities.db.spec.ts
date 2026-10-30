import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { resetDatabase } from '#lib/server/testing/factories.ts';
import type { AuthModule, ExternalIdentity } from '#lib/server/modules/types.ts';
import {
	IdentityError,
	linkIdentity,
	listIdentities,
	refreshIdentity,
	signIn,
	unlinkIdentity
} from './identities';

const external = (id: string, username = id, data = {}): ExternalIdentity => ({
	providerUserId: id,
	username,
	data
});

const module = (id: string, extra: Partial<AuthModule> = {}): AuthModule => ({
	id,
	name: id,
	createAuthorizationURL: () => new URL('http://example.com'),
	handleCallback: async () => external('x'),
	...extra
});

beforeEach(resetDatabase);

describe('signIn', () => {
	it('creates a user on first sign-in and reuses it afterwards', async () => {
		const first = await signIn('discord', external('1', 'Nelly'));
		expect(first.created).toBe(true);
		const again = await signIn('discord', external('1', 'nelly-renamed', { a: 1 }));
		expect(again).toEqual({ userId: first.userId, created: false });

		const [identity] = await listIdentities(first.userId);
		expect(identity).toMatchObject({ username: 'nelly-renamed', data: { a: 1 } });
	});

	it('picks a free username', async () => {
		await signIn('discord', external('1', 'sam'));
		const { userId } = await signIn('tetrio', external('2', 'SAM'));
		const [row] = await db.execute<{ username: string }>(
			sql`SELECT username FROM users WHERE id = ${userId}`
		);
		expect(row.username).toBe('sam-2');
	});
});

describe('linkIdentity', () => {
	it('adds an identity to the user', async () => {
		const { userId } = await signIn('discord', external('1'));
		await linkIdentity(userId, module('tetrio'), external('t1'));
		expect((await listIdentities(userId)).map((i) => i.moduleId)).toEqual(['discord', 'tetrio']);
	});

	it('refuses an identity that belongs to someone else', async () => {
		const alice = await signIn('discord', external('a'));
		await signIn('tetrio', external('t1'));
		await expect(linkIdentity(alice.userId, module('tetrio'), external('t1'))).rejects.toThrow(
			'already linked to another user'
		);
	});

	it('refuses a second account on the same platform', async () => {
		const { userId } = await signIn('discord', external('1'));
		await expect(linkIdentity(userId, module('discord'), external('2'))).rejects.toThrow(
			'Unlink it first'
		);
	});
});

describe('unlinkIdentity', () => {
	it('keeps the last sign-in method', async () => {
		const { userId } = await signIn('discord', external('1'));
		await expect(unlinkIdentity(userId, 'discord')).rejects.toBeInstanceOf(IdentityError);

		await linkIdentity(userId, module('tetrio'), external('t1'));
		await unlinkIdentity(userId, 'discord');
		expect((await listIdentities(userId)).map((i) => i.moduleId)).toEqual(['tetrio']);
	});
});

describe('refreshIdentity', () => {
	it('respects the module refresh interval', async () => {
		let fetches = 0;
		const tetrio = module('tetrio', {
			refreshInterval: 60_000,
			refreshProfile: async (identity) => {
				fetches++;
				return { ...identity, data: { rank: 'x' } };
			}
		});
		const { userId } = await signIn('tetrio', external('t1'));

		expect(await refreshIdentity(userId, tetrio)).toBe(false);
		expect(await refreshIdentity(userId, tetrio, Date.now() + 61_000)).toBe(true);
		expect(fetches).toBe(1);
		expect((await listIdentities(userId))[0].data).toEqual({ rank: 'x' });
	});
});
