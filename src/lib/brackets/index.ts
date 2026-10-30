import {
	doubleElimination,
	singleElimination,
	type DoubleEliminationOptions,
	type SingleEliminationOptions
} from './elimination';
import { roundRobin, type RoundRobinOptions } from './roundRobin';
import { pairSwissRound, type SwissOptions } from './swiss';
import type { MatchTemplate, StageType } from './types';

export * from './types';
export * from './seeding';
export * from './elimination';
export * from './roundRobin';
export * from './swiss';
export * from './resolve';
export * from './standings';

export type StageOptions = SingleEliminationOptions &
	DoubleEliminationOptions &
	RoundRobinOptions &
	SwissOptions;

/**
 * The matches a stage (or one group of it) starts with. Swiss only gets its first round; later
 * rounds are paired with `pairSwissRound` once the previous one is finished.
 *
 * @param seeds participant ids, best seed first
 */
export function generateStage(
	type: StageType,
	seeds: string[],
	options: StageOptions = {}
): MatchTemplate[] {
	if (seeds.length < 2) throw new Error('A stage needs at least two entrants.');
	switch (type) {
		case 'single_elimination':
			return singleElimination(seeds, options);
		case 'double_elimination':
			return doubleElimination(seeds, options);
		case 'round_robin':
			return roundRobin(seeds, options);
		case 'swiss':
			return pairSwissRound(seeds, [], 1, options);
	}
}
