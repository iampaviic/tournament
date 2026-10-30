import { computeStandings } from './standings';
import { DEFAULT_SCORING, type MatchState, type MatchTemplate, type Scoring } from './types';

/** The usual number of Swiss rounds: enough for a single undefeated entrant to remain. */
export function defaultSwissRounds(entrants: number): number {
	return Math.max(1, Math.ceil(Math.log2(entrants)));
}

export interface SwissOptions {
	scoring?: Scoring;
	/** Search budget before rematches are allowed. High enough to never matter in practice. */
	maxSteps?: number;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Pairs the next Swiss round. Entrants with equal points play each other where possible (top half
 * against bottom half of each score group), nobody plays the same opponent twice unless there is
 * no other way, and with an odd field the lowest-ranked entrant without a bye yet gets one.
 *
 * @param entrants all entrants, in seed order
 * @param history the states of all matches of earlier rounds
 * @param round the round being paired (1-based)
 */
export function pairSwissRound(
	entrants: string[],
	history: MatchState[],
	round: number,
	options: SwissOptions = {}
): MatchTemplate[] {
	const standings = computeStandings(entrants, history, {
		scoring: options.scoring ?? DEFAULT_SCORING,
		tiebreakers: ['buchholz', 'sonneborn_berger']
	});
	const points = new Map(standings.map((row) => [row.entrant, row.points]));
	let players = standings.map((row) => row.entrant);

	const played = new Set<string>();
	const hadBye = new Set<string>();
	for (const match of history) {
		const [a, b] = match.entrants;
		if (a && b) played.add(pairKey(a, b));
		if (match.status === 'bye' && match.winner) hadBye.add(match.winner);
	}

	let bye: string | null = null;
	if (players.length % 2 === 1) {
		bye = [...players].reverse().find((p) => !hadBye.has(p)) ?? players[players.length - 1];
		players = players.filter((p) => p !== bye);
	}

	const pairs =
		pair(players, points, played, options.maxSteps ?? 100_000) ??
		pair(players, points, new Set(), Infinity)!;

	const templates = pairs.map(([a, b], i): MatchTemplate => ({
		id: `R${round}-${i + 1}`,
		side: 'main',
		round,
		position: i + 1,
		slots: [{ entrant: a }, { entrant: b }]
	}));
	if (bye) {
		templates.push({
			id: `R${round}-${templates.length + 1}`,
			side: 'main',
			round,
			position: templates.length + 1,
			slots: [{ entrant: bye }, { entrant: null }]
		});
	}
	return templates;
}

/**
 * Backtracking search: the top unpaired entrant takes the most suitable opponent it hasn't played,
 * and the rest are paired recursively. Returns `null` if no pairing avoids rematches within budget.
 */
function pair(
	players: string[],
	points: Map<string, number>,
	played: Set<string>,
	maxSteps: number
): [string, string][] | null {
	let steps = 0;

	function search(remaining: string[]): [string, string][] | null {
		if (remaining.length === 0) return [];
		if (++steps > maxSteps) return null;
		const [top, ...others] = remaining;
		for (const opponent of candidates(top, others, points)) {
			if (played.has(pairKey(top, opponent))) continue;
			const rest = search(others.filter((p) => p !== opponent));
			if (rest) return [[top, opponent], ...rest];
			if (steps > maxSteps) return null;
		}
		return null;
	}

	return search(players);
}

/** Opponents for `top` in order of preference. */
function candidates(top: string, others: string[], points: Map<string, number>): string[] {
	const score = points.get(top)!;
	const group = others.filter((p) => points.get(p) === score);
	// Top half against bottom half: with `top` first in a group of g, the ideal opponent is the
	// entrant halfway down the group.
	const half = Math.floor((group.length + 1) / 2) - 1;
	const fromGroup = [...group.slice(half), ...group.slice(0, half).reverse()];
	const rest = others
		.filter((p) => points.get(p) !== score)
		.sort((a, b) => Math.abs(points.get(a)! - score) - Math.abs(points.get(b)! - score));
	return [...fromGroup, ...rest];
}
