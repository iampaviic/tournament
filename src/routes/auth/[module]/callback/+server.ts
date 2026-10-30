import { error, redirect } from '@sveltejs/kit';
import { takeFlow } from '#lib/server/auth/flow.ts';
import { safeRedirectTarget } from '#lib/server/auth/guards.ts';
import { createSession, invalidateSession, setSessionCookie } from '#lib/server/auth/session.ts';
import { setFlash } from '#lib/server/flash.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import { AuthModuleError } from '#lib/server/modules/types.ts';
import { IdentityError, linkIdentity, signIn } from '#lib/server/services/identities.ts';
import type { RequestHandler } from './$types';

/** Where the auth module's provider sends the user back to. */
export const GET: RequestHandler = async ({ params, url, cookies, locals }) => {
	const module = getModule(params.module);
	if (!module) error(404, 'Unknown sign-in method.');

	const flow = takeFlow(cookies);
	const state = url.searchParams.get('state');
	if (!flow || flow.moduleId !== module.id || !state || state !== flow.state) {
		setFlash(cookies, 'Your sign-in expired or was started in another tab. Please try again.');
		redirect(303, '/login');
	}

	const linking = flow.intent === 'link';
	if (linking && !locals.user) redirect(303, '/login');
	const failureTarget = linking ? '/settings/identities' : '/login';

	let userId: string;
	try {
		const external = await module.handleCallback({
			url,
			codeVerifier: flow.codeVerifier,
			redirectUri: new URL(`/auth/${module.id}/callback`, url.origin).href
		});
		if (linking) {
			await linkIdentity(locals.user!.id, module, external);
			userId = locals.user!.id;
		} else {
			({ userId } = await signIn(module.id, external));
		}
	} catch (e) {
		if (e instanceof AuthModuleError || e instanceof IdentityError) {
			setFlash(cookies, e.message);
			redirect(303, failureTarget);
		}
		throw e;
	}

	if (linking) {
		// Keep the current session: linking must not change which module the user signed in with.
		redirect(303, safeRedirectTarget(flow.next, '/settings/identities'));
	}

	if (locals.session) await invalidateSession(locals.session.id);
	const { token, session } = await createSession(userId, module.id);
	setSessionCookie(cookies, token, session.expiresAt);
	redirect(303, safeRedirectTarget(flow.next));
};
