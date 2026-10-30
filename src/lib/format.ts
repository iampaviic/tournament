import type { Scores } from '#lib/matchReports.ts';
import { getLocale } from '#lib/paraglide/runtime.js';

export function formatDate(
	date: Date,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
	return date.toLocaleDateString(getLocale(), options);
}

export function formatTime(date: Date): string {
	return date.toLocaleTimeString(getLocale(), { timeStyle: 'short' });
}

/** Scores as "2–1". */
export const formatScore = ([a, b]: Scores) => `${a}–${b}`;
