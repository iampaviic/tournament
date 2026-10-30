import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db } from '#lib/server/db/index.ts';
import { sessions, users, type Session, type User } from '#lib/server/db/schema.ts';
import { SESSION_COOKIE, generateToken, hashToken, sessionExpiry, shouldRenew } from './token';

export type SessionValidation = { session: Session; user: User } | { session: null; user: null };

/** Creates a session and returns the token to put in the cookie. */
export async function createSession(userId: string, authModuleId: string) {
	const token = generateToken();
	const [session] = await db
		.insert(sessions)
		.values({ id: hashToken(token), userId, authModuleId, expiresAt: sessionExpiry() })
		.returning();
	return { token, session };
}

/** Looks up the session for a token, deleting it if expired and extending it if close to expiry. */
export async function validateSessionToken(token: string): Promise<SessionValidation> {
	const [row] = await db
		.select({ session: sessions, user: users })
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, hashToken(token)));
	if (!row) return { session: null, user: null };

	const { session, user } = row;
	if (session.expiresAt.getTime() <= Date.now()) {
		await db.delete(sessions).where(eq(sessions.id, session.id));
		return { session: null, user: null };
	}
	if (shouldRenew(session.expiresAt)) {
		session.expiresAt = sessionExpiry();
		await db
			.update(sessions)
			.set({ expiresAt: session.expiresAt })
			.where(eq(sessions.id, session.id));
	}
	return { session, user };
}

export async function invalidateSession(sessionId: string) {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
	cookies.set(SESSION_COOKIE, token, { path: '/', sameSite: 'lax', expires: expiresAt });
}

export function deleteSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
