import { describe, expect, it } from 'vitest';
import { singleElimination } from './elimination';
import { isStageComplete, resolveStage } from './resolve';
import { favorites, seedIds, simulate } from './simulate';
import type { MatchResult } from './types';

describe('resolveStage', () => {
	const templates = singleElimination(seedIds(4));

	it('fills later matches as results come in', () => {
		let stage = resolveStage(templates, {});
		expect(stage.byId.get('M1-1')).toMatchObject({ status: 'ready', entrants: ['s1', 's4'] });
		expect(stage.byId.get('M2-1')).toMatchObject({
			status: 'waiting',
			entrants: [undefined, undefined]
		});

		stage = resolveStage(templates, { 'M1-1': { entrants: ['s1', 's4'], winner: 1 } });
		expect(stage.byId.get('M1-1')).toMatchObject({
			status: 'completed',
			winner: 's4',
			loser: 's1'
		});
		expect(stage.byId.get('M2-1')?.entrants).toEqual(['s4', undefined]);
	});

	it('drops results whose entrants changed after a correction', () => {
		const { results } = simulate(templates, favorites);
		expect(isStageComplete(resolveStage(templates, results))).toBe(true);

		// s4 actually beat s1 in the first round, so the final as reported can't stand.
		const corrected: Record<string, MatchResult> = {
			...results,
			'M1-1': { entrants: ['s1', 's4'], winner: 1 }
		};
		const stage = resolveStage(templates, corrected);
		expect(stage.byId.get('M2-1')).toMatchObject({ status: 'ready', entrants: ['s4', 's2'] });
		expect(stage.staleResults).toEqual(['M2-1']);
		expect(isStageComplete(stage)).toBe(false);
	});

	it('reports results for unknown matches as stale', () => {
		const stage = resolveStage(templates, { nope: { entrants: ['s1', 's2'], winner: 0 } });
		expect(stage.staleResults).toEqual(['nope']);
	});

	it('waits for the other entrant before a bye advances anyone', () => {
		const stage = resolveStage(
			[
				...templates,
				{
					id: 'X',
					side: 'main',
					round: 3,
					position: 1,
					slots: [{ match: 'M2-1', outcome: 'winner' }, { entrant: null }]
				}
			],
			{}
		);
		expect(stage.byId.get('X')?.status).toBe('waiting');
	});

	it('keeps draws without a winner', () => {
		const stage = resolveStage(templates, { 'M1-1': { entrants: ['s1', 's4'], winner: null } });
		expect(stage.byId.get('M1-1')?.status).toBe('completed');
		expect(stage.byId.get('M1-1')?.winner).toBeUndefined();
		expect(stage.byId.get('M2-1')?.status).toBe('waiting');
	});
});
