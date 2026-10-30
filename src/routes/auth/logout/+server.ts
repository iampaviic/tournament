import { redirect } from '@sveltejs/kit';
import { deleteSessionCookie, invalidateSession } from '#lib/server/auth/session.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	if (locals.session) await invalidateSession(locals.session.id);
	deleteSessionCookie(cookies);
	redirect(303, '/');
};
