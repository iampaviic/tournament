import { createHash, randomBytes } from 'node:crypto';

export const SESSION_COOKIE = 'session';
const DAY = 24 * 60 * 60 * 1000;
export const SESSION_LIFETIME = 30 * DAY;
/** Sessions are extended once less than this much time is left. */
export const SESSION_RENEW_BEFORE = 15 * DAY;

/** A random token with 160 bits of entropy. */
export function generateToken(): string {
	return randomBytes(20).toString('base64url');
}

/** Sessions are stored by token hash, so a database leak does not leak usable tokens. */
export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function sessionExpiry(now = Date.now()): Date {
	return new Date(now + SESSION_LIFETIME);
}

export function shouldRenew(expiresAt: Date, now = Date.now()): boolean {
	return expiresAt.getTime() - now < SESSION_RENEW_BEFORE;
}
