import { z } from 'zod';
import { m } from '#lib/paraglide/messages.js';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;

export const usernameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(USERNAME_MIN, { error: () => m.validation_username_min({ min: USERNAME_MIN }) })
	.max(USERNAME_MAX, { error: () => m.validation_username_max({ max: USERNAME_MAX }) })
	.regex(/^[a-z0-9_-]+$/, { error: () => m.validation_username_format() });

/** Turns a provider username like "Jöhn.Doe" into a valid handle like "john-doe". */
export function slugifyUsername(input: string): string {
	const slug = input
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/đ/g, 'd')
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, USERNAME_MAX - 4);
	return slug.length >= USERNAME_MIN ? slug : `user-${slug}`.replace(/-$/, '');
}

/** Candidate handles in the order they should be tried: `name`, `name-2`, `name-3`, ... */
export function* usernameCandidates(base: string): Generator<string> {
	const slug = slugifyUsername(base);
	yield slug;
	for (let n = 2; ; n++) yield `${slug}-${n}`;
}
