import { describe, expect, it } from 'vitest';
import { isRedirect, isHttpError } from '@sveltejs/kit';
import { requireTrusted, requireUser, safeRedirectTarget } from './guards';

const event = (user: unknown, trusted = false) => ({
	locals: { user, session: null, trusted } as App.Locals,
	url: new URL('http://localhost/settings?tab=1')
});

describe('requireUser', () => {
	it('redirects anonymous users to login and back', () => {
		try {
			requireUser(event(null));
			expect.unreachable();
		} catch (e) {
			expect(isRedirect(e) && e.location).toBe('/login?next=%2Fsettings%3Ftab%3D1');
		}
	});
});

describe('requireTrusted', () => {
	it('rejects users signed in with an untrusted module', () => {
		try {
			requireTrusted(event({ id: 'u' }, false));
			expect.unreachable();
		} catch (e) {
			expect(isHttpError(e, 403)).toBe(true);
		}
	});

	it('returns the user for trusted sessions', () => {
		expect(requireTrusted(event({ id: 'u' }, true))).toEqual({ id: 'u' });
	});
});

describe('safeRedirectTarget', () => {
	it.each([
		['/o/fer', '/o/fer'],
		[null, '/dashboard'],
		['https://evil.example', '/dashboard'],
		['//evil.example', '/dashboard'],
		['/\\evil.example', '/dashboard']
	])('%s → %s', (next, expected) => {
		expect(safeRedirectTarget(next)).toBe(expected);
	});
});
