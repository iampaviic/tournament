import { fail } from '@sveltejs/kit';
import { requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { getStructure, setStructure } from '#lib/server/services/tournaments.ts';
import {
	DEFAULT_STAGE_SETTINGS,
	STAGE_TYPES,
	type StageConfig,
	type StageSettings
} from '#lib/tournaments.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

const defaultGroupStage: StageConfig = {
	type: 'round_robin',
	settings: { ...DEFAULT_STAGE_SETTINGS, groupCount: 2, scoring: { win: 3, draw: 1, loss: 0 } }
};

export const load: PageServerLoad = async (event) => {
	const { tournament } = await requireTournamentAdmin(event);
	const stages: StageConfig[] = (await getStructure(tournament.id)).map(({ type, settings }) => ({
		type,
		settings
	}));
	const final = stages.at(-1)!;
	// Both layouts are prepared so switching between them in the form keeps what makes sense.
	return {
		stageCount: stages.length,
		oneStage: final,
		twoStages: [stages.length === 2 ? stages[0] : defaultGroupStage, final] as const
	};
};

function readStage(form: FormData, prefix: string, isGroupStage: boolean): StageConfig {
	const text = (key: string) => String(form.get(prefix + key) ?? '').trim();
	const number = (key: string, fallback: number) =>
		text(key) === '' ? fallback : Number(text(key));
	const type = STAGE_TYPES.find((t) => t === text('type')) ?? 'single_elimination';
	const settings: StageSettings = {
		groupCount: isGroupStage ? number('groupCount', 1) : 1,
		advancePerGroup: number('advancePerGroup', DEFAULT_STAGE_SETTINGS.advancePerGroup),
		thirdPlaceMatch: form.has(prefix + 'thirdPlaceMatch'),
		grandFinal: form.has(prefix + 'grandFinalReset') ? 'reset' : 'single',
		doubleRoundRobin: form.has(prefix + 'doubleRoundRobin'),
		swissRounds: text('swissRounds') === '' ? null : Number(text('swissRounds')),
		scoring: {
			win: number('win', DEFAULT_STAGE_SETTINGS.scoring.win),
			draw: number('draw', DEFAULT_STAGE_SETTINGS.scoring.draw),
			loss: number('loss', DEFAULT_STAGE_SETTINGS.scoring.loss)
		}
	};
	return { type, settings };
}

export const actions: Actions = {
	default: async (event) => {
		const { tournament } = await requireTournamentAdmin(event);
		const form = await event.request.formData();
		const structure =
			form.get('stageCount') === '2'
				? [readStage(form, 's0.', true), readStage(form, 's1.', false)]
				: [readStage(form, 's0.', false)];
		try {
			await setStructure(tournament, structure);
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { error: e.message });
			throw e;
		}
		return { message: m.structure_saved() };
	}
};
