import { describe, expect, it } from 'vitest';
import { formatDate, formatScore } from './format';

describe('formatDate', () => {
	const date = new Date('2026-12-12T13:00:00Z');

	it('formats a date', () => {
		expect(formatDate(date, { dateStyle: 'medium', timeZone: 'UTC' })).toBe('Dec 12, 2026');
	});

	it('formats a date with its time', () => {
		expect(formatDate(date, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })).toBe(
			'Dec 12, 2026, 1:00 PM'
		);
	});
});

describe('formatScore', () => {
	it('joins the scores with an en dash', () => {
		expect(formatScore([2, 1])).toBe('2–1');
	});
});
