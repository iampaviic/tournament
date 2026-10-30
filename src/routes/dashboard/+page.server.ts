import { requireUser } from '#lib/server/auth/guards.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import { listUserOrganizations } from '#lib/server/services/organizations.ts';
import { listUserTournaments } from '#lib/server/services/tournaments.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const moduleId = event.locals.session!.authModuleId;
	return {
		sessionModule: getModule(moduleId)?.name ?? moduleId,
		organizations: await listUserOrganizations(user.id),
		tournaments: (await listUserTournaments(user.id)).map((t) => ({ ...t, detail: t.orgName }))
	};
};
