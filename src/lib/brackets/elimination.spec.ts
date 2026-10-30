import { describe, expect, it } from 'vitest';
import { doubleElimination, singleElimination } from './elimination';
import { resolveStage } from './resolve';
import { favorites, random, seedIds, simulate, type Pick } from './simulate';
import { eliminationStandings } from './standings';
import type { MatchState } from './types';

const randomPick = (seed: number): Pick => {
	const next = random(seed);
	return () => (next() < 0.5 ? 0 : 1);
};

/** Matches actually played (not byes). */
const played = (matches: MatchState[]) => matches.filter((m) => m.status === 'completed');

const lossesOf = (matches: MatchState[]) => {
	const losses = new Map<string, number>();
	for (const m of played(matches)) losses.set(m.loser!, (losses.get(m.loser!) ?? 0) + 1);
	return losses;
};

const ranks = (seeds: string[], matches: MatchState[]) =>
	Object.fromEntries(eliminationStandings(seeds, matches).map((p) => [p.entrant, p.rank]));

describe('singleElimination', () => {
	it('builds a full bracket in seed order', () => {
		const templates = singleElimination(seedIds(8));
		expect(templates).toHaveLength(7);
		expect(templates.filter((t) => t.round === 1).map((t) => t.slots)).toEqual([
			[{ entrant: 's1' }, { entrant: 's8' }],
			[{ entrant: 's4' }, { entrant: 's5' }],
			[{ entrant: 's2' }, { entrant: 's7' }],
			[{ entrant: 's3' }, { entrant: 's6' }]
		]);
		expect(templates.at(-1)).toMatchObject({
			id: 'M3-1',
			slots: [
				{ match: 'M2-1', outcome: 'winner' },
				{ match: 'M2-2', outcome: 'winner' }
			]
		});
	});

	it('gives byes to the top seeds', () => {
		const { stage } = simulate(singleElimination(seedIds(5)), favorites);
		const firstRound = stage.matches.filter((m) => m.template.round === 1);
		expect(firstRound.map((m) => m.status)).toEqual(['bye', 'completed', 'bye', 'bye']);
		expect(ranks(seedIds(5), stage.matches)).toEqual({ s1: 1, s2: 2, s3: 3, s4: 3, s5: 5 });
	});

	it('plays a third place match when asked', () => {
		const { stage } = simulate(singleElimination(seedIds(8), { thirdPlaceMatch: true }), favorites);
		expect(stage.byId.get('TP')).toMatchObject({ entrants: ['s4', 's3'], winner: 's3' });
		expect(ranks(seedIds(8), stage.matches)).toEqual({
			s1: 1,
			s2: 2,
			s3: 3,
			s4: 4,
			s5: 5,
			s6: 5,
			s7: 5,
			s8: 5
		});
	});

	it.each(Array.from({ length: 31 }, (_, i) => i + 2))(
		'%i entrants: everyone but the champion loses exactly once',
		(n) => {
			const seeds = seedIds(n);
			const { stage } = simulate(singleElimination(seeds), randomPick(n));
			const losses = lossesOf(stage.matches);
			expect(played(stage.matches)).toHaveLength(n - 1);
			expect([...losses.values()].every((count) => count === 1)).toBe(true);
			const placements = eliminationStandings(seeds, stage.matches);
			expect(placements.filter((p) => p.rank === 1)).toHaveLength(1);
			expect(placements.every((p) => p.rank !== null)).toBe(true);
			expect(stage.staleResults).toEqual([]);
		}
	);
});

describe('doubleElimination', () => {
	it('builds winners, losers and grand final matches', () => {
		const templates = doubleElimination(seedIds(8));
		const count = (side: string) => templates.filter((t) => t.side === side).length;
		expect(count('winners')).toBe(7);
		expect(count('losers')).toBe(6);
		expect(templates.filter((t) => t.side === 'grand_final').map((t) => t.id)).toEqual([
			'GF1',
			'GF2'
		]);
	});

	it('ranks entrants by when they were knocked out', () => {
		const { stage } = simulate(doubleElimination(seedIds(8)), favorites);
		expect(stage.byId.get('GF2')?.status).toBe('skipped');
		expect(ranks(seedIds(8), stage.matches)).toEqual({
			s1: 1,
			s2: 2,
			s3: 3,
			s4: 4,
			s5: 5,
			s6: 5,
			s7: 7,
			s8: 7
		});
	});

	it('resets the grand final when the losers bracket champion wins it', () => {
		const templates = doubleElimination(seedIds(4));
		// s2 beats s1 in the first grand final.
		const pick: Pick = (a, b, match) =>
			match.template.id === 'GF1' ? 1 : match.template.id === 'GF2' ? 0 : favorites(a, b, match);
		const { stage } = simulate(templates, pick);
		expect(stage.byId.get('GF1')).toMatchObject({ entrants: ['s1', 's2'], winner: 's2' });
		expect(stage.byId.get('GF2')).toMatchObject({ entrants: ['s1', 's2'], winner: 's1' });
		expect(ranks(seedIds(4), stage.matches)).toMatchObject({ s1: 1, s2: 2 });
	});

	it('waits for the reset before ranking the finalists', () => {
		const pick: Pick = (a, b, match) => (match.template.id === 'GF1' ? 1 : favorites(a, b, match));
		const { results } = simulate(doubleElimination(seedIds(4)), pick);
		delete results.GF2;
		const stage = resolveStage(doubleElimination(seedIds(4)), results);
		expect(stage.byId.get('GF2')?.status).toBe('ready');
		expect(ranks(seedIds(4), stage.matches)).toMatchObject({ s1: null, s2: null, s3: 3 });
	});

	it('can decide the title in a single grand final', () => {
		const templates = doubleElimination(seedIds(4), { grandFinal: 'single' });
		expect(templates.some((t) => t.id === 'GF2')).toBe(false);
		const pick: Pick = (a, b, match) => (match.template.id === 'GF1' ? 1 : favorites(a, b, match));
		const { stage } = simulate(templates, pick);
		expect(ranks(seedIds(4), stage.matches)).toMatchObject({ s2: 1, s1: 2 });
	});

	// The losers final can't avoid them: the best winners semifinal loser lost to a finalist.
	it.each([8, 16, 32, 64, 128])('%i entrants: no rematches before the losers final', (n) => {
		const { stage } = simulate(doubleElimination(seedIds(n)), favorites);
		const losersFinal = 2 * (Math.log2(n) - 1);
		const key = (m: MatchState) => [...m.entrants].sort().join('|');
		const winnersPairs = new Set(
			played(stage.matches)
				.filter((m) => m.template.side === 'winners')
				.map(key)
		);
		const rematches = played(stage.matches).filter(
			(m) =>
				m.template.side === 'losers' && m.template.round < losersFinal && winnersPairs.has(key(m))
		);
		expect(rematches.map((m) => m.template.id)).toEqual([]);
	});

	it.each(Array.from({ length: 31 }, (_, i) => i + 2))(
		'%i entrants: everyone but the champion loses exactly twice',
		(n) => {
			const seeds = seedIds(n);
			const { stage } = simulate(doubleElimination(seeds), randomPick(n * 7));
			const placements = eliminationStandings(seeds, stage.matches);
			const champion = placements.find((p) => p.rank === 1)!.entrant;
			const losses = lossesOf(stage.matches);

			expect(placements.filter((p) => p.rank === 1)).toHaveLength(1);
			expect(placements.every((p) => p.rank !== null)).toBe(true);
			expect(losses.get(champion) ?? 0).toBeLessThanOrEqual(1);
			for (const entrant of seeds) {
				if (entrant !== champion) expect(losses.get(entrant)).toBe(2);
			}
			expect(stage.matches.some((m) => m.status === 'ready' || m.status === 'waiting')).toBe(false);
		}
	);
});
