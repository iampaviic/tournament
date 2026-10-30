import { matchQueue } from '#lib/matchReports.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import { listMatches } from '#lib/server/services/matches.ts';
import { listUserOrganizations } from '#lib/server/services/organizations.ts';
import { getBracket } from '#lib/server/services/stages.ts';
import { listOrgTournaments, listUserTournaments } from '#lib/server/services/tournaments.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const user = requireUser(event);
	const moduleId = event.locals.session!.authModuleId;
	const organizations = await listUserOrganizations(user.id);

	// The organizer's desk: every tournament they run that isn't over, and for those being played,
	// how many matches wait on an organizer (a dispute or a call for help).
	const running = [];
	for (const org of organizations) {
		for (const t of await listOrgTournaments(org.id, { includeDrafts: true })) {
			if (t.status === 'completed') continue;
			const waiting =
				t.status === 'running'
					? matchQueue(await listMatches(await getBracket(t.id))).filter(
							(match) => match.progress === 'disputed' || match.helpRequested
						).length
					: 0;
			running.push({ ...t, orgSlug: org.slug, detail: org.name, waiting });
		}
	}

	running.sort((a, b) => b.waiting - a.waiting);

	return {
		sessionModule: getModule(moduleId)?.name ?? moduleId,
		organizations: organizations.map(({ slug, name, role }) => ({ slug, name, role })),
		running,
		tournaments: (await listUserTournaments(user.id)).map((t) => ({ ...t, detail: t.orgName }))
	};
};
