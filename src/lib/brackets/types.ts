/**
 * The bracket engine works on plain data and never touches the database. Stages are described by
 * match templates; the current state of every match is derived from the templates plus results.
 */

/** A participant id, or `null` for a bye (an empty spot in an elimination bracket). */
export type Entrant = string | null;

export type Outcome = 'winner' | 'loser';

/** A slot is filled either by a known entrant or by the winner/loser of an earlier match. */
export type SlotSource = { entrant: Entrant } | { match: string; outcome: Outcome };

export type BracketSide = 'main' | 'winners' | 'losers' | 'grand_final' | 'third_place';

export interface MatchTemplate {
	/** Unique within the stage (or group), e.g. `W2-1`, `L3-2`, `GF1`, `R1-4`. */
	id: string;
	side: BracketSide;
	/** 1-based round within its side. */
	round: number;
	/** 1-based position within its round, top to bottom. */
	position: number;
	slots: [SlotSource, SlotSource];
	/**
	 * Final places for elimination formats: where the loser (and, for the last matches, the
	 * winner) of this match finish. Missing when the loser plays on.
	 */
	placement?: { winner?: number; loser?: number };
	/**
	 * Grand final reset: this match is only played if the entrant in slot 1 of the referenced
	 * match (the losers bracket champion) won it.
	 */
	resetOf?: string;
}

/**
 * A reported result. It records which entrants played, so a result stops applying when an earlier
 * result is corrected and different entrants end up in the match.
 */
export interface MatchResult {
	entrants: [string, string];
	/** Index of the winning slot, or `null` for a draw (round robin and Swiss only). */
	winner: 0 | 1 | null;
	/** Games or points won by each slot, e.g. `[3, 1]`. */
	scores?: [number, number];
}

/**
 * - `waiting`: an entrant is not known yet
 * - `ready`: both entrants are known and the match can be played
 * - `completed`: a result applies
 * - `bye`: one (or both) of the entrants is a bye, so the other advances without playing
 * - `skipped`: a grand final reset that is not needed
 */
export type MatchStatus = 'waiting' | 'ready' | 'completed' | 'bye' | 'skipped';

export interface MatchState {
	template: MatchTemplate;
	/** `undefined` while the entrant is not known yet. */
	entrants: [Entrant | undefined, Entrant | undefined];
	status: MatchStatus;
	result?: MatchResult;
	/** Set for completed matches without a draw and for byes. */
	winner?: Entrant;
	loser?: Entrant;
}

export type StageType = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss';

export interface Scoring {
	win: number;
	draw: number;
	loss: number;
}

export const DEFAULT_SCORING: Scoring = { win: 1, draw: 0.5, loss: 0 };

export type Tiebreaker =
	'head_to_head' | 'buchholz' | 'sonneborn_berger' | 'game_difference' | 'games_won' | 'wins';
