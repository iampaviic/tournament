import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import {
	deleteSessionCookie,
	setSessionCookie,
	validateSessionToken
} from '#lib/server/auth/session.ts';
import { SESSION_COOKIE } from '#lib/server/auth/token.ts';
import { isTrusted } from '#lib/server/modules/registry.ts';

const handleSession: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.session = null;
	event.locals.trusted = false;

	const token = event.cookies.get(SESSION_COOKIE);
	if (token) {
		const { session, user } = await validateSessionToken(token);
		if (session) {
			setSessionCookie(event.cookies, token, session.expiresAt);
			event.locals.user = user;
			event.locals.session = session;
			// Checked on every request, so removing a module from TRUSTED_AUTH_MODULES takes effect at once.
			event.locals.trusted = isTrusted(session.authModuleId);
		} else {
			deleteSessionCookie(event.cookies);
		}
	}
	return resolve(event);
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		return resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		);
	});

export const handle: Handle = sequence(handleSession, handleParaglide);
