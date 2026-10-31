import type { BracketSide, StageType } from '#lib/brackets/index.ts';
import type { MatchProgress } from '#lib/matchReports.ts';
import type { TournamentStatus } from '#lib/server/db/schema.ts';
import { m } from '#lib/paraglide/messages.js';

/** Translated names for values that come from the database or the bracket engine. */

export const statusLabel = (status: TournamentStatus): string =>
	({
		draft: m.status_draft,
		registration: m.status_registration,
		check_in: m.status_check_in,
		running: m.status_running,
		completed: m.status_completed
	})[status]();

export const formatLabel = (type: StageType): string =>
	({
		single_elimination: m.format_single_elimination,
		double_elimination: m.format_double_elimination,
		round_robin: m.format_round_robin,
		swiss: m.format_swiss
	})[type]();

export const matchStatusLabel = (status: MatchProgress): string =>
	({
		waiting: m.match_status_waiting,
		ready: m.match_status_ready,
		reported: m.match_status_reported,
		disputed: m.match_status_disputed,
		completed: m.match_status_completed,
		bye: m.match_status_bye,
		skipped: m.match_status_skipped
	})[status]();

/** Heading for a part of a bracket; `null` for the only part of the stage. */
export const sideLabel = (side: BracketSide): string | null =>
	side === 'main'
		? null
		: {
				winners: m.side_winners,
				losers: m.side_losers,
				grand_final: m.side_grand_final,
				third_place: m.side_third_place
			}[side]();

export const groupName = (index: number) => m.group_name({ name: String.fromCharCode(65 + index) });

export const stageLabel = (index: number, count: number) =>
	count === 1 ? m.stage_only() : index === 0 ? m.stage_group() : m.stage_final();

/** Where a match is played, e.g. "Final stage · Losers bracket"; empty when there's only one part. */
export const matchContext = (match: {
	stageIndex: number;
	stageCount: number;
	groupIndex: number;
	groupCount: number;
	side: BracketSide;
}) =>
	[
		match.stageCount > 1 ? stageLabel(match.stageIndex, match.stageCount) : null,
		match.groupCount > 1 ? groupName(match.groupIndex) : null,
		sideLabel(match.side)
	]
		.filter(Boolean)
		.join(' · ');

/** Column heading in the bracket view. `rounds` is the number of rounds in that side. */
export function roundTitle(
	{ side, round, rounds }: { side: BracketSide; round: number; rounds: number },
	elimination: boolean
): string {
	const fromEnd = rounds - round;
	switch (side) {
		case 'main':
			if (!elimination || fromEnd > 2) return m.round_name({ round });
			return [m.round_final, m.round_semifinals, m.round_quarterfinals][fromEnd]();
		case 'winners':
			return fromEnd === 0 ? m.round_winners_final() : m.round_winners({ round });
		case 'losers':
			return fromEnd === 0 ? m.round_losers_final() : m.round_losers({ round });
		case 'grand_final':
			return round === 1 ? m.round_grand_final() : m.round_reset();
		case 'third_place':
			return m.side_third_place();
	}
}

/**
 * The chip colour for a match's progress: violet while it is open to play, pink-red on a dispute,
 * green once done. Gold stays for the primary action and the winner.
 */
export const progressTone = (progress: MatchProgress): string =>
	progress === 'disputed'
		? 'danger'
		: progress === 'ready' || progress === 'reported'
			? 'play'
			: progress === 'completed'
				? 'success'
				: '';

/** The chip colour for a tournament's phase, on the same scale as a match's. */
export const statusTone = (status: TournamentStatus): string =>
	({ draft: '', registration: 'play', check_in: 'play', running: 'play', completed: 'success' })[
		status
	];
