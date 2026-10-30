import { resolveStage, singleElimination, type MatchResult } from '#lib/brackets/index.ts';
import type { BracketMatch } from '#lib/bracketView.ts';
import type { ThemeParticipant } from './types';

/** A small made-up bracket for previewing themes: both semifinals played, the final up next. */
export const sampleParticipants: Record<string, ThemeParticipant> = Object.fromEntries(
	(
		[
			['a', 'Aurora', 'X', '24,412', 'HR'],
			['b', 'Blitz', 'SS', '21,980', 'SI'],
			['c', 'Comet', 'S+', '20,315', 'AT'],
			['d', 'Drift', 'A', '16,870', 'HU']
		] as const
	).map(([id, name, rank, tr, country]) => [
		id,
		{ id, name, avatarUrl: null, fields: { rank, tr, country } }
	])
);

const templates = singleElimination(['a', 'b', 'c', 'd'], { thirdPlaceMatch: true });
const unplayed = resolveStage(templates, {});
const result = (id: string, scores: [number, number]): MatchResult => ({
	entrants: unplayed.byId.get(id)!.entrants as [string, string],
	winner: scores[0] > scores[1] ? 0 : 1,
	scores
});

export const sampleMatches: BracketMatch[] = resolveStage(templates, {
	'M1-1': result('M1-1', [3, 1]),
	'M1-2': result('M1-2', [2, 3])
}).matches.map((state) => ({
	id: state.template.id,
	template: state.template,
	status: state.status,
	entrants: state.entrants,
	result: state.result ?? null
}));
