import { describe, expect, it } from 'vitest';
import {
	computeStandings,
	eliminationStandings,
	generateStage,
	isStageComplete,
	meetingRound,
	nextPowerOfTwo,
	pairSwissRound,
	resolveStage,
	seedAdvancers,
	snakeGroups,
	type MatchResult,
	type MatchState,
	type MatchTemplate,
	type StageType
} from './index';
import { favorites, random, seedIds, simulate } from './simulate';

describe('generateStage', () => {
	it.each<StageType>(['single_elimination', 'double_elimination', 'round_robin', 'swiss'])(
		'%s needs at least two entrants',
		(type) => {
			expect(() => generateStage(type, ['s1'])).toThrow('at least two');
			expect(generateStage(type, seedIds(2)).length).toBeGreaterThan(0);
		}
	);
});

describe('two-stage tournament', () => {
	it('plays round robin groups, then seeds the playoffs so group mates meet late', () => {
		const groups = snakeGroups(seedIds(16), 4);
		const next = random(42);
		const rankings = groups.map((group) => {
			const { stage } = simulate(generateStage('round_robin', group), () => (next() < 0.7 ? 0 : 1));
			expect(isStageComplete(stage)).toBe(true);
			return computeStandings(group, stage.matches, {
				scoring: { win: 3, draw: 1, loss: 0 },
				tiebreakers: ['head_to_head', 'game_difference']
			}).map((row) => row.entrant);
		});

		const seeds = seedAdvancers(rankings, 2);
		expect(seeds).toHaveLength(8);
		const groupOf = (entrant: string) => groups.findIndex((g) => g.includes(entrant));
		for (let a = 0; a < seeds.length; a++) {
			for (let b = a + 1; b < seeds.length; b++) {
				if (groupOf(seeds[a]) === groupOf(seeds[b])) {
					expect(meetingRound(a + 1, b + 1, nextPowerOfTwo(seeds.length))).toBe(3);
				}
			}
		}

		const { stage } = simulate(generateStage('single_elimination', seeds), favorites);
		const strongest = seeds.toSorted((x, y) => Number(x.slice(1)) - Number(y.slice(1)))[0];
		expect(eliminationStandings(seeds, stage.matches)[0]).toEqual({ entrant: strongest, rank: 1 });
	});

	it('plays Swiss rounds, then a double elimination top 8', () => {
		const entrants = seedIds(24);
		const templates: MatchTemplate[] = [];
		const results: Record<string, MatchResult> = {};
		let history: MatchState[] = [];
		for (let round = 1; round <= 5; round++) {
			const pairs =
				round === 1 ? generateStage('swiss', entrants) : pairSwissRound(entrants, history, round);
			templates.push(...pairs);
			for (const t of pairs) {
				const [a, b] = t.slots.map((s) => ('entrant' in s ? s.entrant : null));
				if (a && b) results[t.id] = { entrants: [a, b], winner: favorites(a, b, undefined!) };
			}
			history = resolveStage(templates, results).matches;
		}

		const top8 = computeStandings(entrants, history, {
			tiebreakers: ['buchholz', 'sonneborn_berger']
		})
			.slice(0, 8)
			.map((row) => row.entrant);
		expect(top8.slice(0, 1)).toEqual(['s1']);

		const { stage } = simulate(generateStage('double_elimination', top8), favorites);
		expect(eliminationStandings(top8, stage.matches)[0]).toEqual({ entrant: 's1', rank: 1 });
	});
});
