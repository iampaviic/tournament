import { error, redirect, type RequestEvent } from '@sveltejs/kit';

/** Returns the signed-in user, or redirects to the login page and back afterwards. */
export function requireUser(event: Pick<RequestEvent, 'locals' | 'url'>) {
	const { user } = event.locals;
	if (!user) {
		const next = event.url.pathname + event.url.search;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}
	return user;
}

/**
 * Like `requireUser`, but also requires the session to come from a trusted auth module.
 * Use it for every admin interface.
 */
export function requireTrusted(event: Pick<RequestEvent, 'locals' | 'url'>) {
	const user = requireUser(event);
	if (!event.locals.trusted) {
		error(403, 'Sign in with a secure method to access admin pages.');
	}
	return user;
}

/** Only allows same-site relative paths as post-login redirect targets. */
export function safeRedirectTarget(next: string | null | undefined, fallback = '/dashboard') {
	if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
		return fallback;
	}
	return next;
}
