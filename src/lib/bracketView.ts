import {
	compareTemplates,
	type BracketSide,
	type MatchResult,
	type MatchState,
	type MatchStatus,
	type MatchTemplate
} from '#lib/brackets/index.ts';

/** A match as the bracket pages show it. */
export interface BracketMatch {
	id: string;
	template: MatchTemplate;
	status: MatchStatus;
	/** Participant ids; `null` is a bye, `undefined` not known yet. */
	entrants: MatchState['entrants'];
	result: MatchResult | null;
}

/** Groups a stage's matches by bracket side and round, in bracket order, for display. */
export function sections<T extends { template: MatchTemplate }>(matches: T[]) {
	const result: { side: BracketSide; rounds: { round: number; matches: T[] }[] }[] = [];
	for (const match of matches.toSorted((a, b) => compareTemplates(a.template, b.template))) {
		const { side, round } = match.template;
		let section = result.find((s) => s.side === side);
		if (!section) result.push((section = { side, rounds: [] }));
		let bucket = section.rounds.find((r) => r.round === round);
		if (!bucket) section.rounds.push((bucket = { round, matches: [] }));
		bucket.matches.push(match);
	}
	return result;
}
