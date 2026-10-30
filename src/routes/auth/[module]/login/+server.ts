import { error, redirect } from '@sveltejs/kit';
import { startFlow } from '#lib/server/auth/flow.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { generateToken } from '#lib/server/auth/token.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import { generateCodeVerifier } from '#lib/server/modules/oauth2.ts';
import { m } from '#lib/paraglide/messages.js';
import type { RequestHandler } from './$types';

/** Starts signing in (or linking an account, with `?intent=link`) with an auth module. */
export const GET: RequestHandler = async (event) => {
	const module = getModule(event.params.module);
	if (!module) error(404, m.auth_error_unknown_module());

	const intent = event.url.searchParams.get('intent') === 'link' ? 'link' : 'login';
	if (intent === 'link') requireUser(event);

	const state = generateToken();
	const codeVerifier = generateCodeVerifier();
	startFlow(event.cookies, {
		moduleId: module.id,
		state,
		codeVerifier,
		intent,
		next: event.url.searchParams.get('next')
	});

	const url = await module.createAuthorizationURL({
		state,
		codeVerifier,
		redirectUri: new URL(`/auth/${module.id}/callback`, event.url.origin).href,
		requestUrl: event.url
	});
	// The module decides where its sign-in happens, usually on another site.
	redirect(302, url, { external: true });
};
