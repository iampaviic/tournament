import type { Tournament } from '#lib/server/db/schema.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import { listMatches } from '#lib/server/services/matches.ts';
import { bracketParticipants, getParticipant } from '#lib/server/services/participants.ts';
import { getBracket } from '#lib/server/services/stages.ts';
import { tournamentTheme } from '#lib/server/themes.ts';

/**
 * What a bracket sheet shows: the stages, the names on them, the theme, the viewer's own line and
 * the matches an organizer has to decide.
 */
export async function loadSheet(tournament: Tournament, userId: string | undefined) {
	const theme = tournamentTheme(tournament.themeId);
	const stages = await getBracket(tournament.id);
	const me = userId ? await getParticipant(tournament.id, userId) : undefined;
	const disputed = (await listMatches(stages))
		.filter((match) => match.progress === 'disputed')
		.map((match) => match.id);
	return {
		stages,
		participants: await bracketParticipants(
			tournament.id,
			theme.module ? getModule(theme.module) : undefined
		),
		themeId: theme.id,
		me: me?.id ?? null,
		disputed
	};
}
