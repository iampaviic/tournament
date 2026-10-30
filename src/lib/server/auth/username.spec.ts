import { describe, expect, it } from 'vitest';
import { slugifyUsername, usernameCandidates, usernameSchema } from './username';

describe('slugifyUsername', () => {
	it.each([
		['Alice', 'alice'],
		['Jöhn.Doe', 'john-doe'],
		['  spaced  out  ', 'spaced-out'],
		['x', 'user-x'],
		['!!!', 'user'],
		['a'.repeat(40), 'a'.repeat(28)]
	])('%s → %s', (input, expected) => {
		expect(slugifyUsername(input)).toBe(expected);
	});

	it('always produces a valid username', () => {
		for (const input of ['Ω', '__', 'ok', 'Ünïcödé Ñame', '😀😀😀']) {
			expect(usernameSchema.safeParse(slugifyUsername(input)).success).toBe(true);
		}
	});
});

describe('usernameCandidates', () => {
	it('appends increasing suffixes', () => {
		const candidates = usernameCandidates('Bob');
		expect([0, 1, 2].map(() => candidates.next().value)).toEqual(['bob', 'bob-2', 'bob-3']);
	});
});
