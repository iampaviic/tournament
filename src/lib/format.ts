import { getLocale } from '#lib/paraglide/runtime.js';

export function formatDate(
	date: Date,
	options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
	return date.toLocaleDateString(getLocale(), options);
}
