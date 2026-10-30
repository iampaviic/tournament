import { describe, expect, it } from 'vitest';
import { mockFetch } from '#lib/server/testing/fetch.ts';
import {
	codeChallenge,
	createAuthorizationURL,
	exchangeCode,
	generateCodeVerifier
} from './oauth2';
import { AuthModuleError } from './types';

const provider = {
	authorizeUrl: 'https://auth.example/authorize',
	tokenUrl: 'https://auth.example/token',
	clientId: 'client',
	clientSecret: 'secret',
	scopes: ['identify', 'email']
};
const redirectUri = 'http://localhost/auth/x/callback';

describe('PKCE', () => {
	it('matches the RFC 7636 example', () => {
		expect(codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
			'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
		);
	});

	it('generates verifiers of valid length', () => {
		expect(generateCodeVerifier()).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});
});

describe('createAuthorizationURL', () => {
	it('includes state, scopes and the S256 challenge', () => {
		const url = createAuthorizationURL(provider, {
			state: 'st',
			codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
			redirectUri,
			requestUrl: new URL('http://localhost')
		});
		expect(Object.fromEntries(url.searchParams)).toEqual({
			response_type: 'code',
			client_id: 'client',
			redirect_uri: redirectUri,
			scope: 'identify email',
			state: 'st',
			code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
			code_challenge_method: 'S256'
		});
	});
});

describe('exchangeCode', () => {
	const callback = (query: string) => ({
		url: new URL(`${redirectUri}?${query}`),
		codeVerifier: 'verifier',
		redirectUri
	});

	it('posts the code and verifier to the token endpoint', async () => {
		const { fetch, calls } = mockFetch({
			'POST https://auth.example/token': () => ({ access_token: 'tok', token_type: 'Bearer' })
		});
		const tokens = await exchangeCode(provider, callback('code=abc&state=st'), fetch);
		expect(tokens.access_token).toBe('tok');
		const body = new URLSearchParams(await calls[0].text());
		expect(body.get('code')).toBe('abc');
		expect(body.get('code_verifier')).toBe('verifier');
		expect(body.get('redirect_uri')).toBe(redirectUri);
	});

	it('reports a cancelled sign-in', async () => {
		const { fetch } = mockFetch({});
		await expect(exchangeCode(provider, callback('error=access_denied'), fetch)).rejects.toThrow(
			'cancelled'
		);
	});

	it('wraps token endpoint failures in a user-facing error', async () => {
		const { fetch } = mockFetch({
			'POST https://auth.example/token': () => new Response('nope', { status: 400 })
		});
		await expect(exchangeCode(provider, callback('code=abc'), fetch)).rejects.toBeInstanceOf(
			AuthModuleError
		);
	});
});
