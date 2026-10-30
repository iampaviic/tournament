import type { Entrant, MatchResult, MatchState, MatchTemplate, SlotSource } from './types';

export interface ResolvedStage {
	/** Every match's state, in template order. */
	matches: MatchState[];
	byId: Map<string, MatchState>;
	/**
	 * Results that no longer apply, because the match is not playable or different entrants are in
	 * it now (an earlier result was corrected). The caller should discard them.
	 */
	staleResults: string[];
}

const sameEntrants = (a: readonly (Entrant | undefined)[], b: readonly (Entrant | undefined)[]) =>
	a[0] === b[0] && a[1] === b[1];

/** Derives the state of every match from the templates and the reported results. */
export function resolveStage(
	templates: MatchTemplate[],
	results: Record<string, MatchResult | undefined>
): ResolvedStage {
	const templatesById = new Map(templates.map((t) => [t.id, t]));
	const byId = new Map<string, MatchState>();
	const staleResults: string[] = [];

	const entrantFor = (source: SlotSource): Entrant | undefined => {
		if ('entrant' in source) return source.entrant;
		const state = resolve(source.match);
		return source.outcome === 'winner' ? state.winner : state.loser;
	};

	function resolve(id: string): MatchState {
		const cached = byId.get(id);
		if (cached) return cached;
		const template = templatesById.get(id);
		if (!template) throw new Error(`Unknown match "${id}"`);

		const entrants: MatchState['entrants'] = [
			entrantFor(template.slots[0]),
			entrantFor(template.slots[1])
		];
		const result = results[id];
		const state = decide(template, entrants, result);
		if (result && state.status !== 'completed') staleResults.push(id);
		byId.set(id, state);
		return state;
	}

	function decide(
		template: MatchTemplate,
		entrants: MatchState['entrants'],
		result: MatchResult | undefined
	): MatchState {
		if (template.resetOf) {
			const first = resolve(template.resetOf);
			if (first.status === 'completed' && first.result?.winner === 0) {
				return { template, entrants, status: 'skipped' };
			}
		}
		const [a, b] = entrants;
		if (a === undefined || b === undefined) {
			// A bye on one side doesn't help until the other entrant is known.
			return { template, entrants, status: 'waiting' };
		}
		if (a === null || b === null) {
			return { template, entrants, status: 'bye', winner: a ?? b, loser: null };
		}
		if (!result || !sameEntrants(result.entrants, entrants)) {
			return { template, entrants, status: 'ready' };
		}
		if (result.winner === null) return { template, entrants, status: 'completed', result };
		return {
			template,
			entrants,
			status: 'completed',
			result,
			winner: entrants[result.winner],
			loser: entrants[result.winner === 0 ? 1 : 0]
		};
	}

	const matches = templates.map((t) => resolve(t.id));
	for (const id of Object.keys(results)) {
		if (results[id] && !templatesById.has(id)) staleResults.push(id);
	}
	return { matches, byId, staleResults };
}

/** Whether every match in the stage is decided. */
export function isStageComplete(stage: ResolvedStage): boolean {
	return stage.matches.every(
		(m) => m.status === 'completed' || m.status === 'bye' || m.status === 'skipped'
	);
}
