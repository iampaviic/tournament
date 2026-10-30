import { DEFAULT_SCORING, type MatchState, type Scoring, type Tiebreaker } from './types';

export interface StandingRow {
	entrant: string;
	/** 1-based. Entrants still tied after every tiebreaker share a rank. */
	rank: number;
	points: number;
	played: number;
	wins: number;
	draws: number;
	losses: number;
	byes: number;
	gamesWon: number;
	gamesLost: number;
	/** Tiebreaker values used for this entrant (only those that apply to the whole field). */
	buchholz: number;
	sonnebornBerger: number;
}

export interface StandingsOptions {
	scoring?: Scoring;
	/** Applied in order to entrants with equal points. Seeding breaks any remaining tie for ordering. */
	tiebreakers?: Tiebreaker[];
}

interface Game {
	a: string;
	b: string;
	/** Points each side earned in this match. */
	pointsA: number;
	pointsB: number;
	scoreA: number;
	scoreB: number;
	result: 'a' | 'b' | 'draw';
}

/**
 * Standings for round robin and Swiss stages, from completed matches and byes. A bye counts as a
 * win without games.
 */
export function computeStandings(
	entrants: string[],
	matches: MatchState[],
	options: StandingsOptions = {}
): StandingRow[] {
	const scoring = options.scoring ?? DEFAULT_SCORING;
	const tiebreakers = options.tiebreakers ?? [];
	const rows = new Map<string, StandingRow>(
		entrants.map((entrant) => [
			entrant,
			{
				entrant,
				rank: 0,
				points: 0,
				played: 0,
				wins: 0,
				draws: 0,
				losses: 0,
				byes: 0,
				gamesWon: 0,
				gamesLost: 0,
				buchholz: 0,
				sonnebornBerger: 0
			}
		])
	);

	const games: Game[] = [];
	for (const match of matches) {
		if (match.status === 'bye' && match.winner) {
			const row = rows.get(match.winner);
			if (row) {
				row.byes++;
				row.wins++;
				row.points += scoring.win;
			}
			continue;
		}
		if (match.status !== 'completed' || !match.result) continue;
		const [a, b] = match.result.entrants;
		const [scoreA, scoreB] = match.result.scores ?? [0, 0];
		const result = match.result.winner === null ? 'draw' : match.result.winner === 0 ? 'a' : 'b';
		const pointsFor = (side: 'a' | 'b') =>
			result === 'draw' ? scoring.draw : result === side ? scoring.win : scoring.loss;
		games.push({ a, b, pointsA: pointsFor('a'), pointsB: pointsFor('b'), scoreA, scoreB, result });
	}

	const record = (
		entrant: string,
		points: number,
		own: number,
		other: number,
		won: boolean | null
	) => {
		const row = rows.get(entrant);
		if (!row) return;
		row.played++;
		row.points += points;
		row.gamesWon += own;
		row.gamesLost += other;
		if (won === null) row.draws++;
		else if (won) row.wins++;
		else row.losses++;
	};
	for (const game of games) {
		const draw = game.result === 'draw';
		record(game.a, game.pointsA, game.scoreA, game.scoreB, draw ? null : game.result === 'a');
		record(game.b, game.pointsB, game.scoreB, game.scoreA, draw ? null : game.result === 'b');
	}

	// Buchholz: the sum of the opponents' points. Sonneborn-Berger: opponents' points weighted by
	// the share of the match won against them.
	for (const game of games) {
		const rowA = rows.get(game.a);
		const rowB = rows.get(game.b);
		if (!rowA || !rowB) continue;
		rowA.buchholz += rowB.points;
		rowB.buchholz += rowA.points;
		if (scoring.win > 0) {
			rowA.sonnebornBerger += (rowB.points * game.pointsA) / scoring.win;
			rowB.sonnebornBerger += (rowA.points * game.pointsB) / scoring.win;
		}
	}

	const seed = new Map(entrants.map((entrant, i) => [entrant, i]));
	const value = (tiebreaker: Tiebreaker, row: StandingRow, group: Set<string>): number => {
		switch (tiebreaker) {
			case 'head_to_head':
				return games.reduce((sum, g) => {
					if (!group.has(g.a) || !group.has(g.b)) return sum;
					if (g.a === row.entrant) return sum + g.pointsA;
					if (g.b === row.entrant) return sum + g.pointsB;
					return sum;
				}, 0);
			case 'buchholz':
				return row.buchholz;
			case 'sonneborn_berger':
				return row.sonnebornBerger;
			case 'game_difference':
				return row.gamesWon - row.gamesLost;
			case 'games_won':
				return row.gamesWon;
			case 'wins':
				return row.wins;
		}
	};

	/** Splits tied rows into ranked buckets, applying tiebreakers from `index` on. */
	function breakTies(group: StandingRow[], index: number): StandingRow[][] {
		if (group.length <= 1 || index >= tiebreakers.length) return [group];
		const tiebreaker = tiebreakers[index];
		const members = new Set(group.map((row) => row.entrant));
		const buckets = bucketBy(group, (row) => value(tiebreaker, row, members));
		if (buckets.length === 1) return breakTies(group, index + 1);
		// Head-to-head depends on who is tied, so it starts over within each smaller tie.
		const next = tiebreaker === 'head_to_head' ? index : index + 1;
		return buckets.flatMap((bucket) => breakTies(bucket, next));
	}

	const ranked = bucketBy([...rows.values()], (row) => row.points).flatMap((tied) =>
		breakTies(tied, 0)
	);
	const ordered: StandingRow[] = [];
	for (const bucket of ranked) {
		const rank = ordered.length + 1;
		for (const row of bucket.sort((x, y) => seed.get(x.entrant)! - seed.get(y.entrant)!)) {
			ordered.push({ ...row, rank });
		}
	}
	return ordered;
}

/** Groups items by a numeric key, highest key first. */
function bucketBy<T>(items: T[], key: (item: T) => number): T[][] {
	const groups = new Map<number, T[]>();
	for (const item of items) {
		const k = key(item);
		groups.set(k, [...(groups.get(k) ?? []), item]);
	}
	return [...groups.entries()].sort(([a], [b]) => b - a).map(([, group]) => group);
}

export interface Placement {
	entrant: string;
	/** `null` while the entrant is still in the stage. Entrants knocked out together share a rank. */
	rank: number | null;
}

/** Final places in an elimination stage, from the `placement` of the last match each entrant played. */
export function eliminationStandings(entrants: string[], matches: MatchState[]): Placement[] {
	const ranks = new Map<string, number>();
	for (const match of matches) {
		const { placement } = match.template;
		if (!placement || match.status === 'skipped' || match.status === 'waiting') continue;
		if (match.status === 'ready') {
			// Still playing (a grand final reset): an earlier placement no longer applies.
			for (const entrant of match.entrants) if (entrant) ranks.delete(entrant);
			continue;
		}
		if (match.winner && placement.winner !== undefined) ranks.set(match.winner, placement.winner);
		if (match.loser && placement.loser !== undefined) ranks.set(match.loser, placement.loser);
	}

	const unranked = Number.MAX_SAFE_INTEGER;
	return entrants
		.map((entrant) => ({ entrant, rank: ranks.get(entrant) ?? null }))
		.sort((a, b) => (a.rank ?? unranked) - (b.rank ?? unranked));
}
