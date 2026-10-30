import { describe, expect, it } from 'vitest';
import { roundRobin } from './roundRobin';
import { seedIds } from './simulate';
import type { MatchTemplate } from './types';

const pairsOf = (templates: MatchTemplate[]) =>
	templates.map((t) => t.slots.map((s) => ('entrant' in s ? s.entrant : '?')) as [string, string]);

describe('roundRobin', () => {
	it.each(Array.from({ length: 15 }, (_, i) => i + 2))('%i entrants: everyone meets once', (n) => {
		const seeds = seedIds(n);
		const templates = roundRobin(seeds);
		const seen = new Set(pairsOf(templates).map((pair) => [...pair].sort().join('|')));

		expect(templates).toHaveLength((n * (n - 1)) / 2);
		expect(seen.size).toBe(templates.length);
		expect(Math.max(...templates.map((t) => t.round))).toBe(n % 2 === 0 ? n - 1 : n);

		const rounds = Map.groupBy(templates, (t) => t.round);
		for (const matches of rounds.values()) {
			const entrants = pairsOf(matches).flat();
			expect(new Set(entrants).size).toBe(entrants.length);
		}
	});

	it('plays everyone twice with slots swapped', () => {
		const templates = roundRobin(seedIds(4), { double: true });
		expect(templates).toHaveLength(12);
		const first = pairsOf(templates.filter((t) => t.round <= 3));
		const second = pairsOf(templates.filter((t) => t.round > 3));
		expect(second).toEqual(first.map(([a, b]) => [b, a]));
	});

	it('pairs the first round by seed', () => {
		expect(pairsOf(roundRobin(seedIds(4)).filter((t) => t.round === 1))).toEqual([
			['s1', 's4'],
			['s2', 's3']
		]);
	});
});
