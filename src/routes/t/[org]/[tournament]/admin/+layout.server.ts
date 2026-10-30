import { requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { getStructure } from '#lib/server/services/tournaments.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const { tournament, org, role } = await requireTournamentAdmin(event);
	const structure = await getStructure(tournament.id);
	return {
		org: { slug: org.slug, name: org.name },
		tournament: {
			slug: tournament.slug,
			name: tournament.name,
			status: tournament.status
		},
		role,
		nextStageReady:
			structure.length === 2 &&
			structure[0].status === 'completed' &&
			structure[1].status === 'pending'
	};
};
