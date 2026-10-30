import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatNumber, formatRecord, formatScore } from './format';

const date = new Date('2030-05-01T18:00:00Z');

describe('formatDateTime', () => {
	it('shows the date and the time', () => {
		const text = formatDateTime(date);
		expect(text).toContain('2030');
		expect(text).toContain(':00');
	});
});

describe('formatDate', () => {
	it('shows the date only by default', () => {
		const text = formatDate(date);
		expect(text).toContain('2030');
		expect(text).not.toContain(':');
	});

	it('takes date options', () => {
		expect(formatDate(date, { year: 'numeric', month: 'long', timeZone: 'UTC' })).toBe('May 2030');
	});
});

describe('formatNumber', () => {
	it('groups digits', () => {
		expect(formatNumber(1234567)).toBe('1,234,567');
	});
});

describe('formatScore and formatRecord', () => {
	it('join with en dashes', () => {
		expect(formatScore([2, 1])).toBe('2–1');
		expect(formatRecord({ won: 2, drawn: 0, lost: 1 })).toBe('2–0–1');
	});
});
