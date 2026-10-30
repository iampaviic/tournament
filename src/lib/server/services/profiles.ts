import { and, eq, inArray, or } from 'drizzle-orm';
import type { MatchResult } from '#lib/brackets/index.ts';
import { db } from '#lib/server/db/index.ts';
import { matches } from '#lib/server/db/schema.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import { listIdentities } from './identities';
import { listUserOrganizations } from './organizations';
import { listUserTournaments } from './tournaments';
import { getUserByUsername } from './users';

export interface MatchRecord {
	won: number;
	drawn: number;
	lost: number;
}

/** Counts a participant's wins, draws and losses in the given results of their matches. */
export function matchRecord(participantId: string, results: MatchResult[]): MatchRecord {
	const record = { won: 0, drawn: 0, lost: 0 };
	for (const result of results) {
		if (result.winner === null) record.drawn++;
		else if (result.entrants[result.winner] === participantId) record.won++;
		else record.lost++;
	}
	return record;
}

/** The results of completed matches, by participant. Byes and unplayed matches have none. */
async function resultsByParticipant(participantIds: string[]) {
	const byParticipant = new Map<string, MatchResult[]>();
	if (!participantIds.length) return byParticipant;
	const rows = await db
		.select({ result: matches.result })
		.from(matches)
		.where(
			and(
				eq(matches.status, 'completed'),
				or(
					inArray(matches.participant1Id, participantIds),
					inArray(matches.participant2Id, participantIds)
				)
			)
		);
	for (const { result } of rows) {
		if (!result) continue;
		for (const entrant of result.entrants) {
			byParticipant.set(entrant, [...(byParticipant.get(entrant) ?? []), result]);
		}
	}
	return byParticipant;
}

/**
 * A user's public profile, as `viewerId` (`null`: signed out) may see it. Results are the
 * tournaments they play or played; activity the ones they're registered for that haven't started,
 * and their organizations. Each is `null` when the user hides it, unless they view their own
 * profile. Drafts never appear. `undefined` for an unknown username.
 */
export async function getProfile(username: string, viewerId: string | null) {
	const user = await getUserByUsername(username);
	if (!user) return undefined;
	const isOwn = viewerId === user.id;
	const showResults = isOwn || user.showResults;
	const showActivity = isOwn || user.showActivity;

	const accounts = (await listIdentities(user.id))
		// Dev logins are not real accounts on another platform.
		.filter((identity) => identity.moduleId !== 'dev')
		.map((identity) => ({
			module: getModule(identity.moduleId)?.name ?? identity.moduleId,
			username: identity.username
		}));

	const tournaments = showResults || showActivity ? await listUserTournaments(user.id) : [];

	const played = showResults
		? tournaments.filter((t) => t.status === 'running' || t.status === 'completed')
		: [];
	const byParticipant = await resultsByParticipant(played.map((t) => t.participantId));
	const results = showResults
		? played.map((t) => ({
				orgSlug: t.orgSlug,
				orgName: t.orgName,
				slug: t.slug,
				name: t.name,
				status: t.status,
				date: t.startsAt ?? t.createdAt,
				finalRank: t.finalRank,
				game: t.game,
				record: matchRecord(t.participantId, byParticipant.get(t.participantId) ?? [])
			}))
		: null;

	const activity = showActivity
		? {
				tournaments: tournaments
					.filter((t) => t.status === 'registration' || t.status === 'check_in')
					// Soonest first; the list comes newest first.
					.reverse()
					.map((t) => ({
						orgSlug: t.orgSlug,
						slug: t.slug,
						name: t.name,
						status: t.status,
						startsAt: t.startsAt,
						detail: t.orgName,
						game: t.game
					})),
				organizations: await listUserOrganizations(user.id)
			}
		: null;

	return {
		profile: {
			username: user.username,
			displayName: user.displayName,
			bio: user.bio,
			avatarUrl: user.avatarUrl,
			createdAt: user.createdAt
		},
		isOwn,
		visibility: { results: user.showResults, activity: user.showActivity },
		accounts,
		results,
		activity
	};
}
