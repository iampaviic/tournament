import { loadTournament } from '#lib/server/auth/tournament.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import { bracketParticipants } from '#lib/server/services/participants.ts';
import { getBracket } from '#lib/server/services/stages.ts';
import { tournamentTheme } from '#lib/server/themes.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await loadTournament(event);
	const theme = tournamentTheme(tournament.themeId);
	return {
		stages: await getBracket(tournament.id),
		participants: await bracketParticipants(
			tournament.id,
			theme.module ? getModule(theme.module) : undefined
		),
		themeId: theme.id
	};
};
