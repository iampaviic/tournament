import { describe, expect, it } from 'vitest';
import { SESSION_LIFETIME, generateToken, hashToken, sessionExpiry, shouldRenew } from './token';

describe('session tokens', () => {
	it('generates unique url-safe tokens', () => {
		const tokens = new Set(Array.from({ length: 100 }, generateToken));
		expect(tokens.size).toBe(100);
		for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{27}$/);
	});

	it('hashes tokens to a stable sha-256 hex digest', () => {
		expect(hashToken('abc')).toBe(
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
		);
	});

	it('renews sessions in the second half of their lifetime', () => {
		const now = Date.now();
		expect(shouldRenew(sessionExpiry(now), now)).toBe(false);
		expect(shouldRenew(new Date(now + SESSION_LIFETIME / 2 - 1), now)).toBe(true);
	});
});
