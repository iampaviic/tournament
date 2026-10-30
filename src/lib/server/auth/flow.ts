import type { Cookies } from '@sveltejs/kit';
import { z } from 'zod';

const FLOW_COOKIE = 'auth_flow';

const flowSchema = z.object({
	moduleId: z.string(),
	state: z.string(),
	codeVerifier: z.string(),
	/** `link` adds the identity to the signed-in user instead of signing in. */
	intent: z.enum(['login', 'link']),
	next: z.string().nullable()
});
export type AuthFlow = z.infer<typeof flowSchema>;

/** Remembers an in-progress sign-in between `/auth/[module]/login` and its callback. */
export function startFlow(cookies: Cookies, flow: AuthFlow) {
	const value = Buffer.from(JSON.stringify(flow)).toString('base64url');
	cookies.set(FLOW_COOKIE, value, { path: '/auth', sameSite: 'lax', maxAge: 10 * 60 });
}

/** Reads and clears the in-progress sign-in. Returns `null` if it is missing or malformed. */
export function takeFlow(cookies: Cookies): AuthFlow | null {
	const value = cookies.get(FLOW_COOKIE);
	if (!value) return null;
	cookies.delete(FLOW_COOKIE, { path: '/auth' });
	try {
		return flowSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString()));
	} catch {
		return null;
	}
}
