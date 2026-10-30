import { error, fail } from '@sveltejs/kit';
import { requireUser } from '#lib/server/auth/guards.ts';
import { takeFlash } from '#lib/server/flash.ts';
import { getModule, isTrusted, listModules } from '#lib/server/modules/registry.ts';
import { AuthModuleError } from '#lib/server/modules/types.ts';
import {
	IdentityError,
	listIdentities,
	refreshIdentity,
	unlinkIdentity
} from '#lib/server/services/identities.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const linked = await listIdentities(user.id);
	const sessionModuleId = event.locals.session!.authModuleId;

	return {
		modules: listModules().map((module) => {
			const identity = linked.find((i) => i.moduleId === module.id);
			return {
				id: module.id,
				name: module.name,
				trusted: isTrusted(module.id),
				refreshable: Boolean(module.refreshProfile),
				identity: identity && {
					username: identity.username,
					avatarUrl: identity.avatarUrl,
					fetchedAt: identity.fetchedAt,
					fields:
						module.bracketFields?.({ ...identity, avatarUrl: identity.avatarUrl ?? undefined }) ??
						{}
				}
			};
		}),
		session: {
			module: getModule(sessionModuleId)?.name ?? sessionModuleId,
			trusted: event.locals.trusted
		},
		error: takeFlash(event.cookies)
	};
};

async function moduleFromForm(request: Request) {
	const form = await request.formData();
	const module = getModule(String(form.get('module')));
	if (!module) error(400, m.auth_error_unknown_module());
	return module;
}

export const actions: Actions = {
	unlink: async (event) => {
		const user = requireUser(event);
		const module = await moduleFromForm(event.request);
		try {
			await unlinkIdentity(user.id, module.id);
		} catch (e) {
			if (e instanceof IdentityError) return fail(400, { error: e.message });
			throw e;
		}
	},
	refresh: async (event) => {
		const user = requireUser(event);
		const module = await moduleFromForm(event.request);
		try {
			const refreshed = await refreshIdentity(user.id, module);
			return {
				message: refreshed
					? m.identities_refreshed({ module: module.name })
					: m.identities_fresh({ module: module.name })
			};
		} catch (e) {
			if (e instanceof IdentityError || e instanceof AuthModuleError) {
				return fail(400, { error: e.message });
			}
			throw e;
		}
	}
};
