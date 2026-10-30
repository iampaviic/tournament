import { requireUser } from '#lib/server/auth/guards.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	requireUser(event);
	const moduleId = event.locals.session!.authModuleId;
	return { sessionModule: getModule(moduleId)?.name ?? moduleId };
};
