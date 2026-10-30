import { resolveStage, type ResolvedStage } from './resolve';
import type { MatchResult, MatchState, MatchTemplate } from './types';

export type Pick = (a: string, b: string, match: MatchState) => MatchResult['winner'];

/**
 * Plays a stage to the end by repeatedly reporting a result for every ready match.
 * Used by tests and for generating demo data.
 */
export function simulate(
	templates: MatchTemplate[],
	pick: Pick,
	initial: Record<string, MatchResult> = {}
): { stage: ResolvedStage; results: Record<string, MatchResult> } {
	const results = { ...initial };
	for (;;) {
		const stage = resolveStage(templates, results);
		const ready = stage.matches.filter((m) => m.status === 'ready');
		if (ready.length === 0) return { stage, results };
		for (const match of ready) {
			const [a, b] = match.entrants as [string, string];
			results[match.template.id] = { entrants: [a, b], winner: pick(a, b, match) };
		}
	}
}

/** A small deterministic random number generator (mulberry32), so failures are reproducible. */
export function random(seed: number) {
	return () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Entrant ids `s1`, `s2`, … in seed order. */
export const seedIds = (n: number) => Array.from({ length: n }, (_, i) => `s${i + 1}`);

/** The better seed always wins. */
export const favorites: Pick = (a, b) => (Number(a.slice(1)) < Number(b.slice(1)) ? 0 : 1);
