import { describe, expect, it } from 'vitest';
import { resolveStage } from './resolve';
import { computeStandings } from './standings';
import { favorites, random, seedIds } from './simulate';
import { defaultSwissRounds, pairSwissRound } from './swiss';
import type { MatchResult, MatchState, MatchTemplate } from './types';

const pairsOf = (templates: MatchTemplate[]) =>
	templates.map((t) => t.slots.map((s) => ('entrant' in s ? s.entrant : '?')));

/** Plays a whole Swiss event, pairing each round from the results so far. */
function playSwiss(
	n: number,
	rounds: number,
	pick: (a: string, b: string) => MatchResult['winner']
) {
	const seeds = seedIds(n);
	const templates: MatchTemplate[] = [];
	const results: Record<string, MatchResult> = {};
	let history: MatchState[] = [];
	for (let round = 1; round <= rounds; round++) {
		const next = pairSwissRound(seeds, history, round);
		templates.push(...next);
		for (const t of next) {
			const [a, b] = t.slots.map((s) => ('entrant' in s ? s.entrant : null));
			if (a && b) results[t.id] = { entrants: [a, b], winner: pick(a, b) };
		}
		history = resolveStage(templates, results).matches;
	}
	return { seeds, templates, history };
}

describe('pairSwissRound', () => {
	it('pairs the top half against the bottom half in round one', () => {
		expect(pairsOf(pairSwissRound(seedIds(8), [], 1))).toEqual([
			['s1', 's5'],
			['s2', 's6'],
			['s3', 's7'],
			['s4', 's8']
		]);
	});

	it('gives the bye to the lowest seed', () => {
		const round = pairSwissRound(seedIds(7), [], 1);
		expect(pairsOf(round).at(-1)).toEqual(['s7', null]);
		expect(round).toHaveLength(4);
	});

	it('pairs winners with winners', () => {
		const { history } = playSwiss(8, 1, (a, b) => favorites(a, b, undefined!));
		const round2 = pairSwissRound(seedIds(8), history, 2);
		expect(pairsOf(round2)).toEqual([
			['s1', 's3'],
			['s2', 's4'],
			['s5', 's7'],
			['s6', 's8']
		]);
	});

	it.each(Array.from({ length: 17 }, (_, i) => i + 4))(
		'%i entrants: no rematches, at most one bye each, everyone plays every round',
		(n) => {
			const next = random(n);
			const rounds = defaultSwissRounds(n);
			const { seeds, templates, history } = playSwiss(n, rounds, () => (next() < 0.5 ? 0 : 1));

			const pairs = history
				.filter((m) => m.status === 'completed')
				.map((m) => [...m.entrants].sort().join('|'));
			expect(new Set(pairs).size).toBe(pairs.length);

			const byes = history.filter((m) => m.status === 'bye').map((m) => m.winner);
			expect(new Set(byes).size).toBe(byes.length);

			for (let round = 1; round <= rounds; round++) {
				const entrants = pairsOf(templates.filter((t) => t.round === round))
					.flat()
					.filter(Boolean);
				expect(entrants.sort()).toEqual([...seeds].sort());
			}
		}
	);

	it('leaves exactly one undefeated entrant after the default number of rounds', () => {
		const { seeds, history } = playSwiss(16, defaultSwissRounds(16), (a, b) =>
			favorites(a, b, undefined!)
		);
		const standings = computeStandings(seeds, history);
		expect(standings.filter((row) => row.losses === 0).map((row) => row.entrant)).toEqual(['s1']);
	});

	it('allows a rematch only when there is no other way', () => {
		// Two entrants, three rounds: they have to play again.
		const { history } = playSwiss(2, 3, () => 0);
		expect(history.filter((m) => m.status === 'completed')).toHaveLength(3);
	});
});
