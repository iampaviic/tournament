import { and, eq, inArray, ne } from 'drizzle-orm';
import { z } from 'zod';
import type { BracketSide, MatchResult, MatchStatus } from '#lib/brackets/index.ts';
import { matchNumbers } from '#lib/bracketLayout.ts';
import type { BracketMatch } from '#lib/bracketView.ts';
import {
	matchProgress,
	reportOutcome,
	type MatchProgress,
	type Scores,
	type SideReport
} from '#lib/matchReports.ts';
import { db, type Transaction } from '#lib/server/db/index.ts';
import {
	matchReports,
	matches,
	stages,
	type Match,
	type MatchReport,
	type ReportSource,
	type Stage,
	type Tournament
} from '#lib/server/db/schema.ts';
import { publish } from '#lib/server/events.ts';
import { isElimination } from '#lib/tournaments.ts';
import { ServiceError } from './errors';
import { getParticipant, getParticipantById } from './participants';
import { getBracket, lockStage, refreshStage, type Bracket } from './stages';

export const matchIdSchema = z.uuid('Match not found.');

const scoreSchema = z
	.string('Enter both scores.')
	.trim()
	.regex(/^\d{1,9}$/, 'Scores must be whole numbers, zero or more.')
	.transform(Number);

/** The `score1` and `score2` fields of a result form. */
export const scoresSchema = z
	.object({ score1: scoreSchema, score2: scoreSchema })
	.transform((value): Scores => [value.score1, value.score2]);

/** Finds a match of the tournament and locks its stage, which must be running. */
async function loadMatch(tx: Transaction, tournament: Tournament, matchId: string) {
	const [row] = await tx
		.select({ stageId: matches.stageId })
		.from(matches)
		.innerJoin(stages, eq(matches.stageId, stages.id))
		.where(and(eq(matches.id, matchId), eq(stages.tournamentId, tournament.id)));
	if (!row) throw new ServiceError('Match not found.', 'not_found');
	const stage = await lockStage(tx, row.stageId);
	if (stage.status !== 'running') {
		throw new ServiceError('Results can only change while the stage is being played.');
	}
	// Read after locking, so changes made while waiting for the lock are seen.
	const [match] = await tx.select().from(matches).where(eq(matches.id, matchId));
	return { match, stage };
}

/** The result the scores give, checked against the rules of the stage. */
function resultFor(stage: Stage, match: Match, scores: Scores): MatchResult {
	if (scores.some((score) => !Number.isInteger(score) || score < 0)) {
		throw new ServiceError('Scores must be whole numbers, zero or more.', 'invalid');
	}
	const winner = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
	if (winner === null && isElimination(stage.type)) {
		throw new ServiceError(
			'Elimination matches need a winner, so the scores must differ.',
			'invalid'
		);
	}
	return { entrants: [match.participant1Id!, match.participant2Id!], winner, scores };
}

/** Stores (or clears) the result and refreshes the stage. Returns the ids of changed matches. */
async function applyResult(tx: Transaction, match: Match, result: MatchResult | null) {
	await tx
		.update(matches)
		.set({ result, helpRequested: false, updatedAt: new Date() })
		.where(eq(matches.id, match.id));
	return [match.id, ...(await refreshStage(tx, match.stageId))];
}

/** The players' reports that were made for the match's current entrants, by side. */
function sideReports(entrants: BracketMatch['entrants'], rows: MatchReport[]): SideReport[] {
	return rows
		.flatMap((row): SideReport[] => {
			if (row.source !== 'participant' || !row.participantId) return [];
			if (row.entrants[0] !== entrants[0] || row.entrants[1] !== entrants[1]) return [];
			const side = entrants.indexOf(row.participantId);
			return side === 0 || side === 1 ? [{ side, scores: row.scores }] : [];
		})
		.toSorted((a, b) => a.side - b.side);
}

async function playerReports(tx: Transaction, match: Match) {
	const rows = await tx.select().from(matchReports).where(eq(matchReports.matchId, match.id));
	return sideReports([match.participant1Id, match.participant2Id], rows);
}

/** The side the player plays on, or `null` if they aren't one of the match's players. */
async function sideOf(
	tournament: Tournament,
	match: Match,
	by: { userId: string } | { participantId: string }
) {
	const participant =
		'userId' in by
			? await getParticipant(tournament.id, by.userId)
			: await getParticipantById(tournament.id, by.participantId);
	if (!participant) return null;
	if (participant.id === match.participant1Id) return { side: 0 as const, participant };
	if (participant.id === match.participant2Id) return { side: 1 as const, participant };
	return null;
}

const changed = (tournament: Tournament, ids: string[]) =>
	publish(tournament.id, { type: 'matches', matchIds: [...new Set(ids)] });

/** Who sets a result over the players' reports: an organizer, or an API key (M7). */
export type Override = { userId: string } | { apiKeyId: string };

/** Records (or corrects) a match result, replacing the players' reports. */
export async function setMatchResult(
	tournament: Tournament,
	matchId: string,
	scores: Scores,
	by: Override
) {
	const ids = await db.transaction(async (tx) => {
		const { match, stage } = await loadMatch(tx, tournament, matchId);
		if (match.status !== 'ready' && match.status !== 'completed') {
			throw new ServiceError("This match isn't ready to be played.");
		}
		const result = resultFor(stage, match, scores);
		const source: ReportSource = 'userId' in by ? 'organizer' : 'api_key';
		await tx.delete(matchReports).where(eq(matchReports.matchId, match.id));
		await tx.insert(matchReports).values({
			matchId: match.id,
			source,
			userId: 'userId' in by ? by.userId : null,
			apiKeyId: 'apiKeyId' in by ? by.apiKeyId : null,
			entrants: result.entrants,
			scores
		});
		return applyResult(tx, match, result);
	});
	changed(tournament, ids);
}

export async function clearMatchResult(tournament: Tournament, matchId: string) {
	const ids = await db.transaction(async (tx) => {
		const { match } = await loadMatch(tx, tournament, matchId);
		await tx.delete(matchReports).where(eq(matchReports.matchId, match.id));
		return applyResult(tx, match, null);
	});
	changed(tournament, ids);
}

/** Who reports for one side: the player, or an API key on behalf of a participant (M7). */
type Reporter = { userId: string } | { participantId: string; apiKeyId: string };

async function report(
	tournament: Tournament,
	matchId: string,
	by: Reporter,
	scores: Scores
): Promise<'saved' | 'agreed' | 'disputed'> {
	if (tournament.status !== 'running') {
		throw new ServiceError('Results can only be reported while the tournament is running.');
	}
	const { outcome, ids } = await db.transaction(async (tx) => {
		const { match, stage } = await loadMatch(tx, tournament, matchId);
		if (match.status !== 'ready') throw new ServiceError("This match can't be reported now.");
		const player = await sideOf(tournament, match, by);
		if (!player) {
			throw new ServiceError('Only the players of this match can report its result.', 'invalid');
		}
		const result = resultFor(stage, match, scores);
		const outcome = reportOutcome(await playerReports(tx, match), player.side, scores);
		if (outcome === 'closed') {
			throw new ServiceError("The reports don't match, so an organizer will decide the result.");
		}

		const row = {
			entrants: result.entrants,
			scores,
			userId: 'userId' in by ? by.userId : null,
			apiKeyId: 'apiKeyId' in by ? by.apiKeyId : null,
			updatedAt: new Date()
		};
		await tx
			.insert(matchReports)
			.values({
				matchId: match.id,
				source: 'participant',
				participantId: player.participant.id,
				...row
			})
			.onConflictDoUpdate({
				target: [matchReports.matchId, matchReports.participantId],
				set: row
			});
		const ids = outcome === 'agreed' ? await applyResult(tx, match, result) : [match.id];
		return { outcome, ids };
	});
	changed(tournament, ids);
	return outcome;
}

/**
 * A player reports the scores (see `reportOutcome`). When both players agree, the result is
 * recorded; when they don't, the match is disputed until an organizer sets the result.
 */
export async function reportResult(
	tournament: Tournament,
	matchId: string,
	userId: string,
	scores: Scores
) {
	return report(tournament, matchId, { userId }, scores);
}

/** An API key reports for one of the match's players, with the same rules as `reportResult`. */
export async function reportForParticipant(
	tournament: Tournament,
	matchId: string,
	by: { participantId: string; apiKeyId: string },
	scores: Scores
) {
	return report(tournament, matchId, by, scores);
}

/** A player asks the organizers for help with their match. */
export async function requestHelp(tournament: Tournament, matchId: string, userId: string) {
	if (tournament.status !== 'running') {
		throw new ServiceError('Help can only be requested while the match is being played.');
	}
	await db.transaction(async (tx) => {
		const { match } = await loadMatch(tx, tournament, matchId);
		if (match.status !== 'ready') {
			throw new ServiceError('Help can only be requested while the match is being played.');
		}
		if (!(await sideOf(tournament, match, { userId }))) {
			throw new ServiceError('Only the players of this match can ask for help.');
		}
		await tx.update(matches).set({ helpRequested: true }).where(eq(matches.id, match.id));
	});
	changed(tournament, [matchId]);
}

/** An organizer marks a help request as handled. */
export async function clearHelp(tournament: Tournament, matchId: string) {
	const [row] = await db
		.update(matches)
		.set({ helpRequested: false })
		.where(
			and(
				eq(matches.id, matchId),
				inArray(
					matches.stageId,
					db.select({ id: stages.id }).from(stages).where(eq(stages.tournamentId, tournament.id))
				)
			)
		)
		.returning({ id: matches.id });
	if (!row) throw new ServiceError('Match not found.', 'not_found');
	changed(tournament, [matchId]);
}

/** A match that is played (not a bye), as the match pages show it. */
export interface MatchItem {
	id: string;
	/** Shown to players, counted in play order within the group. */
	number: number;
	stageIndex: number;
	stageCount: number;
	groupIndex: number;
	groupCount: number;
	side: BracketSide;
	/** Participant ids; `null` is a bye, `undefined` not known yet. */
	entrants: BracketMatch['entrants'];
	result: MatchResult | null;
	status: MatchStatus;
	progress: MatchProgress;
	helpRequested: boolean;
	/** The players' reports for the current entrants. */
	reports: SideReport[];
}

/** Every played match of the tournament, by stage, group and number. */
export async function listMatches(bracket: Bracket): Promise<MatchItem[]> {
	const stageIds = bracket.map((stage) => stage.id);
	if (!stageIds.length) return [];
	const reports = await db
		.select({ report: matchReports })
		.from(matchReports)
		.innerJoin(matches, eq(matchReports.matchId, matches.id))
		.where(and(inArray(matches.stageId, stageIds), eq(matchReports.source, 'participant')));
	const help = await db
		.select({ id: matches.id })
		.from(matches)
		.where(and(inArray(matches.stageId, stageIds), eq(matches.helpRequested, true)));
	const helpIds = new Set(help.map((row) => row.id));
	const reportsByMatch = new Map<string, MatchReport[]>();
	for (const { report } of reports) {
		reportsByMatch.set(report.matchId, [...(reportsByMatch.get(report.matchId) ?? []), report]);
	}

	return bracket
		.flatMap((stage) =>
			stage.groups.flatMap((group, groupIndex) => {
				const numbers = matchNumbers(group.matches.map((match) => match.template));
				return group.matches.flatMap((match): MatchItem[] => {
					const number = numbers.get(match.template.id);
					if (number === undefined) return [];
					const sides = sideReports(match.entrants, reportsByMatch.get(match.id) ?? []);
					return [
						{
							id: match.id,
							number,
							stageIndex: stage.index,
							stageCount: bracket.length,
							groupIndex,
							groupCount: stage.groups.length,
							side: match.template.side,
							entrants: match.entrants,
							result: match.result,
							status: match.status,
							progress: matchProgress(match.status, sides),
							helpRequested: helpIds.has(match.id),
							reports: sides
						}
					];
				});
			})
		)
		.toSorted(
			(a, b) => a.stageIndex - b.stageIndex || a.groupIndex - b.groupIndex || a.number - b.number
		);
}

/**
 * A match with its stage, and who decided its result: an organizer, an API key, or `null` when
 * the players agreed (or there is no result).
 */
export async function getMatch(tournamentId: string, matchId: string) {
	const bracket = await getBracket(tournamentId);
	const item = (await listMatches(bracket)).find((match) => match.id === matchId);
	if (!item) return undefined;
	const stage = bracket[item.stageIndex];
	const deciders = await db
		.select({ source: matchReports.source, entrants: matchReports.entrants })
		.from(matchReports)
		.where(and(eq(matchReports.matchId, matchId), ne(matchReports.source, 'participant')));
	const decider = deciders.find(
		(row) => row.entrants[0] === item.entrants[0] && row.entrants[1] === item.entrants[1]
	);
	return {
		...item,
		stageType: stage.type,
		stageStatus: stage.status,
		decidedBy: (decider?.source ?? null) as Exclude<ReportSource, 'participant'> | null
	};
}
