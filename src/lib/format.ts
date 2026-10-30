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

/** A date with its time, e.g. "May 1, 2030, 6:00 PM". */
export function formatDateTime(date: Date): string {
	return formatDate(date, { dateStyle: 'medium', timeStyle: 'short' });
}

/** A number with the locale's digit grouping, e.g. "18,000". */
export function formatNumber(value: number): string {
	return value.toLocaleString(getLocale());
}

/** Scores as "2–1". */
export const formatScore = ([a, b]: Scores) => `${a}–${b}`;

/** A match record as "2–0–1": won, drawn, lost. */
export const formatRecord = ({ won, drawn, lost }: { won: number; drawn: number; lost: number }) =>
	`${won}–${drawn}–${lost}`;
