import type { MatchStatus } from '#lib/brackets/index.ts';

/** Games or points won by each slot, e.g. `[3, 1]`. */
export type Scores = [number, number];

/** A player's report, by the slot they play in. */
export interface SideReport {
	side: 0 | 1;
	scores: Scores;
}

export const sameScores = (a: Scores, b: Scores) => a[0] === b[0] && a[1] === b[1];

/**
 * A match's status, with the players' reports for ready matches: `reported` while only one side
 * has reported, `disputed` when the two reports disagree.
 */
export type MatchProgress = MatchStatus | 'reported' | 'disputed';

export function matchProgress(status: MatchStatus, reports: SideReport[]): MatchProgress {
	if (status !== 'ready' || !reports.length) return status;
	const [a, b] = reports;
	return b && !sameScores(a.scores, b.scores) ? 'disputed' : 'reported';
}

/**
 * What a player's report does. Either player reports first and can change it until the opponent
 * responds: the same scores decide the match (`agreed`), different ones dispute it. Once both
 * sides have reported, only an organizer can decide (`closed`).
 */
export type ReportOutcome = 'saved' | 'agreed' | 'disputed' | 'closed';

export function reportOutcome(reports: SideReport[], side: 0 | 1, scores: Scores): ReportOutcome {
	const opponent = reports.find((report) => report.side !== side);
	if (!opponent) return 'saved';
	if (reports.some((report) => report.side === side)) return 'closed';
	return sameScores(opponent.scores, scores) ? 'agreed' : 'disputed';
}

interface QueueItem {
	progress: MatchProgress;
	helpRequested: boolean;
	stageIndex: number;
	groupIndex: number;
	number: number;
}

/**
 * The matches organizers should look at, in order: disputes, then help requests, then matches
 * waiting for the second report, then ready matches nobody reported yet.
 */
export function matchQueue<T extends QueueItem>(items: T[]): T[] {
	const rank = (item: T) => {
		if (item.progress === 'disputed') return 0;
		if (item.helpRequested) return 1;
		return item.progress === 'reported' ? 2 : 3;
	};
	return items
		.filter((item) => ['ready', 'reported', 'disputed'].includes(item.progress))
		.toSorted(
			(a, b) =>
				rank(a) - rank(b) ||
				a.stageIndex - b.stageIndex ||
				a.groupIndex - b.groupIndex ||
				a.number - b.number
		);
}
