import { loadTournament } from '#lib/server/auth/tournament.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const { tournament, org, isMember } = await loadTournament(event);
	return {
		org: { slug: org.slug, name: org.name },
		tournament: {
			slug: tournament.slug,
			name: tournament.name,
			status: tournament.status,
			startsAt: tournament.startsAt,
			game: tournament.game
		},
		isMember
	};
};
