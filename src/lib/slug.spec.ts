import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
	it.each([
		['FER Tetris Club!', 'fer-tetris-club'],
		['  Šahovski   klub Đakovo ', 'sahovski-klub-dakovo'],
		['---', ''],
		['a'.repeat(50), 'a'.repeat(40)],
		['a'.repeat(39) + ' b', 'a'.repeat(39)]
	])('%s → %s', (input, expected) => {
		expect(slugify(input)).toBe(expected);
	});
});
