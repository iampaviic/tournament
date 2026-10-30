import { z } from 'zod';
import type { StageType, Tiebreaker } from '#lib/brackets/index.ts';

/** Shared between the server and the structure editor. */

export const STAGE_TYPES = [
	'single_elimination',
	'double_elimination',
	'round_robin',
	'swiss'
] as const satisfies readonly StageType[];

export const isElimination = (type: StageType) =>
	type === 'single_elimination' || type === 'double_elimination';

export const stageSettingsSchema = z.object({
	/** 1 means no groups. Only the first of two stages can have groups. */
	groupCount: z.number().int().min(1).max(32),
	/** How many entrants of each group advance to the next stage. */
	advancePerGroup: z.number().int().min(1).max(64),
	thirdPlaceMatch: z.boolean(),
	grandFinal: z.enum(['single', 'reset']),
	doubleRoundRobin: z.boolean(),
	/** `null` means ⌈log₂ n⌉ rounds. */
	swissRounds: z.number().int().min(1).max(30).nullable(),
	scoring: z.object({
		win: z.number().min(0).max(100),
		draw: z.number().min(0).max(100),
		loss: z.number().min(0).max(100)
	})
});
export type StageSettings = z.infer<typeof stageSettingsSchema>;

export const DEFAULT_STAGE_SETTINGS: StageSettings = {
	groupCount: 1,
	advancePerGroup: 2,
	thirdPlaceMatch: false,
	grandFinal: 'reset',
	doubleRoundRobin: false,
	swissRounds: null,
	scoring: { win: 1, draw: 0.5, loss: 0 }
};

export const stageConfigSchema = z.object({
	type: z.enum(STAGE_TYPES),
	settings: stageSettingsSchema
});
export type StageConfig = z.infer<typeof stageConfigSchema>;

export const structureSchema = z
	.array(stageConfigSchema)
	.min(1)
	.max(2)
	.refine((stages) => stages.at(-1)!.settings.groupCount === 1, {
		message: 'The final stage plays as a single group.'
	});

/** Tiebreakers for round robin and Swiss standings, in order. */
export function tiebreakersFor(type: StageType): Tiebreaker[] {
	return type === 'swiss'
		? ['buchholz', 'sonneborn_berger', 'game_difference']
		: ['head_to_head', 'game_difference', 'games_won'];
}
