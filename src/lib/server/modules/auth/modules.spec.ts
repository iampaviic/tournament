import { describe, expect, it } from 'vitest';
import { mockFetch } from '#lib/server/testing/fetch.ts';
import { devModule } from './dev';
import { discordModule } from './discord';
import { checkTetrioEligibility, tetrioConfig, tetrioModule, type TetrioData } from './tetrio';

const redirectUri = 'http://localhost/auth/x/callback';
const callback = (query: string) => ({
	url: new URL(`${redirectUri}?${query}`),
	codeVerifier: 'verifier',
	redirectUri
});

const discordRoutes = {
	'POST https://discord.com/api/oauth2/token': () => ({
		access_token: 'tok',
		token_type: 'Bearer'
	}),
	'GET https://discord.com/api/users/@me': (request: Request) => {
		expect(request.headers.get('Authorization')).toBe('Bearer tok');
		return { id: '80351110224678912', username: 'nelly', global_name: 'Nelly', avatar: 'a1b2' };
	}
};
const credentials = { clientId: 'client', clientSecret: 'secret' };

describe('dev module', () => {
	const module = devModule();

	it('round-trips the username through the callback', async () => {
		const url = module.createAuthorizationURL({
			state: 'st',
			codeVerifier: 'v',
			redirectUri,
			requestUrl: new URL('http://localhost/auth/dev/login?username=Alice')
		}) as URL;
		expect(url.searchParams.get('state')).toBe('st');
		const identity = await module.handleCallback({ url, codeVerifier: 'v', redirectUri });
		expect(identity).toMatchObject({ providerUserId: 'alice', username: 'alice' });
	});

	it('rejects invalid usernames', async () => {
		await expect(module.handleCallback(callback('username=a b'))).rejects.toThrow('Username');
	});
});

describe('discord module', () => {
	it('returns the Discord account', async () => {
		const { fetch } = mockFetch(discordRoutes);
		const identity = await discordModule({ ...credentials, fetch }).handleCallback(
			callback('code=abc&state=st')
		);
		expect(identity).toEqual({
			providerUserId: '80351110224678912',
			username: 'nelly',
			displayName: 'Nelly',
			avatarUrl: 'https://cdn.discordapp.com/avatars/80351110224678912/a1b2.png',
			data: {}
		});
	});
});

describe('tetrio module', () => {
	const tetrioUser = {
		_id: '5e4979d4fad3ca55f6512458',
		username: 'osk',
		avatar_revision: 1700000000,
		country: 'HR',
		connections: { discord: { id: '80351110224678912', username: 'nelly' } }
	};
	const league = { tr: 23012.4, gxe: 98.1, rank: 'x+', bestrank: 'x+', standing: 3 };
	const tetrioRoutes = {
		'GET https://ch.tetr.io/api/users/search/discord:id:80351110224678912': () => ({
			success: true,
			data: { users: [{ _id: tetrioUser._id, username: 'osk' }] }
		}),
		[`GET https://ch.tetr.io/api/users/${tetrioUser._id}/summaries/league`]: () => ({
			success: true,
			data: league
		}),
		[`GET https://ch.tetr.io/api/users/${tetrioUser._id}`]: () => ({
			success: true,
			data: tetrioUser
		})
	};

	it('finds the TETR.IO account connected to the Discord account', async () => {
		const { fetch, calls } = mockFetch({ ...discordRoutes, ...tetrioRoutes });
		const identity = await tetrioModule({ ...credentials, fetch }).handleCallback(
			callback('code=abc')
		);
		expect(identity).toEqual({
			providerUserId: tetrioUser._id,
			username: 'osk',
			avatarUrl: `https://tetr.io/user-content/avatars/${tetrioUser._id}.jpg?rv=1700000000`,
			data: {
				rank: 'x+',
				bestRank: 'x+',
				tr: 23012.4,
				gxe: 98.1,
				standing: 3,
				country: 'HR',
				discordId: '80351110224678912'
			}
		});
		const apiCalls = calls.filter((c) => c.url.startsWith('https://ch.tetr.io'));
		expect(apiCalls.every((c) => c.headers.get('X-Session-ID'))).toBe(true);
	});

	it('explains how to connect Discord when no account is found', async () => {
		const { fetch } = mockFetch({
			...discordRoutes,
			'GET https://ch.tetr.io/api/users/search/': () => ({ success: true, data: null })
		});
		await expect(
			tetrioModule({ ...credentials, fetch }).handleCallback(callback('code=abc'))
		).rejects.toThrow('No TETR.IO account is connected to the Discord account "nelly"');
	});

	it('treats unranked players as rank z without TR', async () => {
		const { fetch } = mockFetch({
			...tetrioRoutes,
			[`GET https://ch.tetr.io/api/users/${tetrioUser._id}/summaries/league`]: () => ({
				success: true,
				data: { tr: -1, gxe: -1, rank: 'z', standing: -1 }
			})
		});
		const module = tetrioModule({ ...credentials, fetch });
		const identity = await module.refreshProfile!({
			providerUserId: tetrioUser._id,
			username: 'osk',
			data: {},
			fetchedAt: new Date()
		});
		expect(identity.data).toMatchObject({ rank: 'z', tr: null, gxe: null, standing: null });
		expect(module.bracketFields!({ ...identity, fetchedAt: new Date() })).toEqual({
			rank: 'Unranked',
			country: 'HR'
		});
	});
});

describe('tetrio eligibility', () => {
	const player = (rank: TetrioData['rank'], tr: number | null): TetrioData => ({
		rank,
		tr,
		bestRank: null,
		gxe: null,
		standing: null,
		country: null,
		discordId: null
	});
	const config = (input: unknown) => tetrioConfig.parse(input);

	it('enforces rank bounds', () => {
		const c = config({ minRank: 'a', maxRank: 's+' });
		expect(checkTetrioEligibility(player('a-', 15000), c)).toEqual({
			ok: false,
			reason: 'Requires rank A or higher.'
		});
		expect(checkTetrioEligibility(player('a', 16000), c).ok).toBe(true);
		expect(checkTetrioEligibility(player('s+', 20000), c).ok).toBe(true);
		expect(checkTetrioEligibility(player('ss', 21000), c)).toEqual({
			ok: false,
			reason: 'Requires rank S+ or lower.'
		});
	});

	it('enforces TR bounds', () => {
		const c = config({ minTr: 10000, maxTr: 20000 });
		expect(checkTetrioEligibility(player('b', 9999), c).ok).toBe(false);
		expect(checkTetrioEligibility(player('s', 20000), c).ok).toBe(true);
		expect(checkTetrioEligibility(player('ss', 20001), c).ok).toBe(false);
	});

	it('lets unranked players in only when allowed', () => {
		expect(checkTetrioEligibility(player('z', null), config({})).ok).toBe(false);
		expect(checkTetrioEligibility(player('z', null), config({ allowUnranked: true })).ok).toBe(
			true
		);
	});

	it('rejects inverted bounds', () => {
		expect(tetrioConfig.safeParse({ minRank: 'x', maxRank: 'a' }).success).toBe(false);
		expect(tetrioConfig.safeParse({ minTr: 5, maxTr: 1 }).success).toBe(false);
	});
});
