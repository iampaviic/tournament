import { fail } from '@sveltejs/kit';
import { requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { setTheme } from '#lib/server/services/tournaments.ts';
import { listThemeIds, tournamentTheme } from '#lib/server/themes.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await requireTournamentAdmin(event);
	return { themeIds: listThemeIds(), current: tournamentTheme(tournament.themeId).id };
};

export const actions: Actions = {
	default: async (event) => {
		const { tournament } = await requireTournamentAdmin(event);
		const themeId = String((await event.request.formData()).get('theme') ?? '');
		try {
			await setTheme(tournament, themeId);
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { error: e.message });
			throw e;
		}
		return { saved: true };
	}
};
