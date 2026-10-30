import { error } from '@sveltejs/kit';
import type { z } from 'zod';
import type { Tournament } from '#lib/server/db/schema.ts';
import type { ChatMessage } from '#lib/server/services/chat.ts';
import { getMatch, type MatchItem } from '#lib/server/services/matches.ts';
import { checkRequirements, listParticipants } from '#lib/server/services/participants.ts';
import type { Bracket } from '#lib/server/services/stages.ts';
import type { listOrgTournaments } from '#lib/server/services/tournaments.ts';
import type {
	matchDetailResource,
	matchResource,
	messageResource,
	participantResource,
	stageResource,
	tournamentResource,
	tournamentSummaryResource
} from './schemas';

/** Service results as the documented response bodies. Dates become ISO strings. */

export function toTournament(row: Tournament): z.input<typeof tournamentResource> {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		description: row.description,
		status: row.status,
		startsAt: row.startsAt?.toISOString() ?? null,
		participantLimit: row.participantLimit,
		themeId: row.themeId,
		createdAt: row.createdAt.toISOString()
	};
}

export function toSummary(
	row: Awaited<ReturnType<typeof listOrgTournaments>>[number]
): z.input<typeof tournamentSummaryResource> {
	return { ...row, startsAt: row.startsAt?.toISOString() ?? null };
}

export function toStages(bracket: Bracket): z.input<typeof stageResource>[] {
	return bracket.map((stage) => ({
		id: stage.id,
		index: stage.index,
		type: stage.type,
		status: stage.status,
		settings: stage.settings,
		groups: stage.groups.map((group) => ({
			participantIds: group.entrants,
			standings: group.standings
		}))
	}));
}

/** The tournament's participants in seed order, with how each meets the requirements. */
export async function toParticipants(
	tournamentId: string
): Promise<z.input<typeof participantResource>[]> {
	const list = await listParticipants(tournamentId);
	const checks = await checkRequirements(
		tournamentId,
		list.map((p) => p.userId)
	);
	return list.map((p) => ({
		id: p.id,
		userId: p.userId,
		username: p.username,
		displayName: p.displayName,
		seed: p.seed,
		checkedInAt: p.checkedInAt?.toISOString() ?? null,
		finalRank: p.finalRank,
		createdAt: p.createdAt.toISOString(),
		requirements: checks.get(p.userId)!.map((check) => ({
			moduleId: check.moduleId,
			moduleName: check.moduleName,
			status: check.status,
			...(check.status === 'ineligible' ? { reason: check.reason } : {})
		}))
	}));
}

export function toMatch(item: MatchItem): z.input<typeof matchResource> {
	return {
		id: item.id,
		number: item.number,
		stageIndex: item.stageIndex,
		groupIndex: item.groupIndex,
		side: item.side,
		status: item.progress,
		entrants: [item.entrants[0] ?? null, item.entrants[1] ?? null],
		result: item.result && {
			scores: item.result.scores ?? null,
			winnerId: item.result.winner === null ? null : item.result.entrants[item.result.winner]
		},
		helpRequested: item.helpRequested,
		reports: item.reports.map((report) => ({
			participantId: item.entrants[report.side]!,
			scores: report.scores
		}))
	};
}

export function toMatchDetail(
	detail: NonNullable<Awaited<ReturnType<typeof getMatch>>>
): z.input<typeof matchDetailResource> {
	return { ...toMatch(detail), decidedBy: detail.decidedBy };
}

/** A match of the tournament as `MatchDetail`. Byes aren't shown, so they aren't found either. */
export async function matchDetail(tournamentId: string, matchId: string) {
	const match = await getMatch(tournamentId, matchId);
	if (!match) error(404, 'Match not found.');
	return toMatchDetail(match);
}

export function toMessage(message: ChatMessage): z.input<typeof messageResource> {
	return {
		id: message.id,
		body: message.body,
		createdAt: message.createdAt.toISOString(),
		asOrganizer: message.asOrganizer,
		author: message.author && {
			username: message.author.username,
			displayName: message.author.displayName
		},
		apiKey: message.apiKey
	};
}
