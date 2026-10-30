import type { Scores } from '#lib/matchReports.ts';
import { getLocale } from '#lib/paraglide/runtime.js';

/** A date, or a date and time when `options` has a `timeStyle`. */
export function formatDate(
	date: Date,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
	// toLocaleDateString rejects timeStyle; toLocaleString takes both.
	return date.toLocaleString(getLocale(), options);
}

export function formatTime(date: Date): string {
	return date.toLocaleTimeString(getLocale(), { timeStyle: 'short' });
}

/** Scores as "2–1". */
export const formatScore = ([a, b]: Scores) => `${a}–${b}`;
