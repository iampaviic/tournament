import { z } from 'zod';

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;

export const usernameSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters.`)
	.max(USERNAME_MAX, `Username must be at most ${USERNAME_MAX} characters.`)
	.regex(/^[a-z0-9_-]+$/, 'Username may only contain lowercase letters, digits, - and _.');

/** Turns a provider username like "Jöhn.Doe" into a valid handle like "john-doe". */
export function slugifyUsername(input: string): string {
	const slug = input
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
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
