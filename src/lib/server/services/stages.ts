import { and, asc, eq, inArray } from 'drizzle-orm';
import {
	compareTemplates,
	computeStandings,
	defaultSwissRounds,
	eliminationStandings,
	generateStage,
	isStageComplete,
	pairSwissRound,
	resolveStage,
	seedAdvancers,
	snakeGroups,
	type MatchState,
	type StageOptions
} from '#lib/brackets/index.ts';
import { db, type Executor, type Transaction } from '#lib/server/db/index.ts';
import {
	matchReports,
	matches,
	participants,
	stages,
	tournaments,
	type Match,
	type Stage,
	type Tournament
} from '#lib/server/db/schema.ts';
import { publish } from '#lib/server/events.ts';
import type { BracketMatch } from '#lib/bracketView.ts';
import { isElimination, tiebreakersFor } from '#lib/tournaments.ts';
import { m } from '#lib/paraglide/messages.js';
import { ServiceError } from './errors';
import { playingParticipants, writeSeeds } from './participants';

/** How the bracket engine plays a stage. */
function stageOptions(stage: Stage): StageOptions {
	const { settings } = stage;
	return {
		thirdPlaceMatch: settings.thirdPlaceMatch,
		grandFinal: settings.grandFinal,
		double: settings.doubleRoundRobin,
		scoring: settings.scoring
	};
}

/** Resolves a group's stored matches. Rows are sorted back into generation order first. */
function resolveRows(rows: Match[]) {
	const sorted = rows.toSorted((a, b) => compareTemplates(a.template, b.template));
	const resolved = resolveStage(
		sorted.map((row) => row.template),
		Object.fromEntries(sorted.map((row) => [row.templateId, row.result ?? undefined]))
	);
	return { sorted, resolved };
}

/** A group's entrants in final order, with ranks (ties broken by seed). */
export function rankGroup(stage: Stage, entrants: string[], states: MatchState[]) {
	if (isElimination(stage.type)) {
		return eliminationStandings(entrants, states).map((p) => ({
			participantId: p.entrant,
			rank: p.rank
		}));
	}
	return computeStandings(entrants, states, {
		scoring: stage.settings.scoring,
		tiebreakers: tiebreakersFor(stage.type)
	}).map((row) => ({ participantId: row.entrant, rank: row.rank as number | null }));
}

/** Locks the stage row for the rest of the transaction, so its matches change one at a time. */
export async function lockStage(tx: Transaction, stageId: string) {
	const [stage] = await tx.select().from(stages).where(eq(stages.id, stageId)).for('update');
	return stage;
}

/** Inserts a stage's matches, splitting the entrants into groups, and starts it. */
async function startStage(tx: Transaction, stage: Stage, entrants: string[], isLast: boolean) {
	const { groupCount, advancePerGroup } = stage.settings;
	if (entrants.length < 2) throw new ServiceError(m.stage_error_too_few());
	if (groupCount > 1 && entrants.length < groupCount * 2) {
		throw new ServiceError(m.stage_error_groups({ groups: groupCount, min: groupCount * 2 }));
	}
	const groups = groupCount > 1 ? snakeGroups(entrants, groupCount) : [entrants];
	if (!isLast) {
		const smallest = Math.min(...groups.map((g) => g.length));
		if (advancePerGroup > smallest) {
			throw new ServiceError(
				m.stage_error_advance_group({ advance: advancePerGroup, size: smallest })
			);
		}
		if (advancePerGroup * groups.length < 2) {
			throw new ServiceError(m.stage_error_advance_total());
		}
	}

	const rows = groups.flatMap((group, groupIndex) =>
		generateStage(stage.type, group, stageOptions(stage)).map((template) => ({
			stageId: stage.id,
			groupIndex,
			templateId: template.id,
			template
		}))
	);
	await tx.insert(matches).values(rows);
	await tx.update(stages).set({ status: 'running', groups }).where(eq(stages.id, stage.id));
	await refreshStage(tx, stage.id);
}

/**
 * Brings the stored match state in line with the templates and results: fills in entrants,
 * updates statuses, discards results that went stale after a correction (and the reports and help
 * requests of matches whose entrants changed or that can't be played anymore), pairs the next
 * Swiss round, and completes the stage (and the tournament) when everything is decided. Returns
 * the ids of the matches that changed.
 */
export async function refreshStage(tx: Transaction, stageId: string): Promise<string[]> {
	const stage = await lockStage(tx, stageId);
	if (stage.status !== 'running') return [];

	const changed: string[] = [];
	let complete = true;
	for (const [groupIndex, entrants] of stage.groups.entries()) {
		for (;;) {
			const rows = await tx
				.select()
				.from(matches)
				.where(and(eq(matches.stageId, stageId), eq(matches.groupIndex, groupIndex)));
			const { resolved } = resolveRows(rows);
			for (const row of rows) {
				const state = resolved.byId.get(row.templateId)!;
				const next = {
					participant1Id: state.entrants[0] ?? null,
					participant2Id: state.entrants[1] ?? null,
					status: state.status,
					result: resolved.staleResults.includes(row.templateId) ? null : row.result
				};
				const entrantsChanged =
					next.participant1Id !== row.participant1Id || next.participant2Id !== row.participant2Id;
				if (entrantsChanged || next.status !== row.status || next.result !== row.result) {
					const stale = entrantsChanged || (next.status !== 'ready' && next.status !== 'completed');
					if (stale) await tx.delete(matchReports).where(eq(matchReports.matchId, row.id));
					await tx
						.update(matches)
						.set({ ...next, ...(stale ? { helpRequested: false } : {}), updatedAt: new Date() })
						.where(eq(matches.id, row.id));
					changed.push(row.id);
				}
			}

			const decided = isStageComplete(resolved);
			if (decided && stage.type === 'swiss') {
				const played = Math.max(...rows.map((row) => row.template.round));
				const rounds = stage.settings.swissRounds ?? defaultSwissRounds(entrants.length);
				if (played < rounds) {
					const next = pairSwissRound(entrants, resolved.matches, played + 1, {
						scoring: stage.settings.scoring
					});
					await tx
						.insert(matches)
						.values(
							next.map((template) => ({ stageId, groupIndex, templateId: template.id, template }))
						);
					continue;
				}
			}
			if (!decided) complete = false;
			break;
		}
	}

	if (complete) {
		await tx.update(stages).set({ status: 'completed' }).where(eq(stages.id, stageId));
		await onStageCompleted(tx, stage);
	}
	return changed;
}

async function stageRankings(executor: Executor, stage: Stage) {
	const rows = await executor.select().from(matches).where(eq(matches.stageId, stage.id));
	return stage.groups.map((entrants, groupIndex) => {
		const { resolved } = resolveRows(rows.filter((row) => row.groupIndex === groupIndex));
		return rankGroup(stage, entrants, resolved.matches);
	});
}

/** When the last stage finishes, final ranks are stored and the tournament is completed. */
async function onStageCompleted(tx: Transaction, stage: Stage) {
	const all = await tx
		.select()
		.from(stages)
		.where(eq(stages.tournamentId, stage.tournamentId))
		.orderBy(asc(stages.index));
	if (stage.index < all.length - 1) return;

	const ranks = new Map<string, number>();
	const [final] = await stageRankings(tx, all[all.length - 1]);
	for (const { participantId, rank } of final) ranks.set(participantId, rank ?? final.length);

	// Entrants knocked out in the group stage follow, by group placing: all third places, then
	// all fourth places, and so on.
	if (all.length === 2) {
		const groups = await stageRankings(tx, all[0]);
		const perGroup = all[0].settings.advancePerGroup;
		let next = ranks.size + 1;
		for (let place = perGroup; place < Math.max(...groups.map((g) => g.length)); place++) {
			const tier = groups.flatMap((g) => (place < g.length ? [g[place].participantId] : []));
			for (const id of tier) ranks.set(id, next);
			next += tier.length;
		}
	}

	for (const [participantId, rank] of ranks) {
		await tx
			.update(participants)
			.set({ finalRank: rank })
			.where(eq(participants.id, participantId));
	}
	await tx
		.update(tournaments)
		.set({ status: 'completed' })
		.where(eq(tournaments.id, stage.tournamentId));
}

/** Starts the tournament with everyone who will play (see `playingParticipants`). */
export async function startTournament(tournament: Tournament) {
	if (tournament.status !== 'registration' && tournament.status !== 'check_in') {
		throw new ServiceError(m.stage_error_not_open());
	}
	await db.transaction(async (tx) => {
		const playing = (await playingParticipants(tx, tournament)).map((p) => p.id);
		// Participants who didn't check in are left out.
		const notPlaying = await tx
			.select({ id: participants.id })
			.from(participants)
			.where(eq(participants.tournamentId, tournament.id));
		const dropped = notPlaying.map((p) => p.id).filter((id) => !playing.includes(id));
		if (dropped.length) await tx.delete(participants).where(inArray(participants.id, dropped));

		await writeSeeds(tx, tournament.id, playing);
		const all = await tx
			.select()
			.from(stages)
			.where(eq(stages.tournamentId, tournament.id))
			.orderBy(asc(stages.index));
		await tx
			.update(tournaments)
			.set({ status: 'running' })
			.where(eq(tournaments.id, tournament.id));
		await startStage(tx, all[0], playing, all.length === 1);
	});
	publish(tournament.id, { type: 'matches', matchIds: [] });
}

/** Starts the final stage with the entrants advancing from the group stage. */
export async function startNextStage(tournament: Tournament) {
	await db.transaction(async (tx) => {
		const all = await tx
			.select()
			.from(stages)
			.where(eq(stages.tournamentId, tournament.id))
			.orderBy(asc(stages.index));
		const next = all.find((stage) => stage.status === 'pending');
		const previous = next && all[next.index - 1];
		if (!next || !previous) throw new ServiceError(m.stage_error_no_next());
		if (previous.status !== 'completed') {
			throw new ServiceError(m.stage_error_unfinished());
		}

		const perGroup = previous.settings.advancePerGroup;
		const rankings = await stageRankings(tx, previous);
		const advancing = seedAdvancers(
			rankings.map((group) => group.map((row) => row.participantId)),
			perGroup
		);
		await startStage(tx, next, advancing, next.index === all.length - 1);
	});
	publish(tournament.id, { type: 'matches', matchIds: [] });
}

/** Everything needed to show a tournament's stages: matches by group and standings. */
export async function getBracket(tournamentId: string) {
	const all = await db
		.select()
		.from(stages)
		.where(eq(stages.tournamentId, tournamentId))
		.orderBy(asc(stages.index));
	const ids = all.map((stage) => stage.id);
	const rows = ids.length
		? await db.select().from(matches).where(inArray(matches.stageId, ids))
		: [];

	return all.map((stage) => ({
		id: stage.id,
		index: stage.index,
		type: stage.type,
		settings: stage.settings,
		status: stage.status,
		groups: stage.groups.map((entrants, groupIndex) => {
			const groupRows = rows.filter((r) => r.stageId === stage.id && r.groupIndex === groupIndex);
			const { resolved } = resolveRows(groupRows);
			const ids = new Map(groupRows.map((row) => [row.templateId, row.id]));
			return {
				entrants,
				standings: rankGroup(stage, entrants, resolved.matches),
				/** The full standings table, for round robin and Swiss. */
				table: isElimination(stage.type)
					? null
					: computeStandings(entrants, resolved.matches, {
							scoring: stage.settings.scoring,
							tiebreakers: tiebreakersFor(stage.type)
						}),
				matches: resolved.matches.map((state): BracketMatch => ({
					id: ids.get(state.template.id)!,
					template: state.template,
					status: state.status,
					entrants: state.entrants,
					result: state.result ?? null
				}))
			};
		})
	}));
}
export type Bracket = Awaited<ReturnType<typeof getBracket>>;
