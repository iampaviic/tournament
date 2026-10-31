import { fail } from '@sveltejs/kit';
import { loadSheet } from '#lib/server/bracketSheet.ts';
import { requireUser } from '#lib/server/auth/guards.ts';
import { loadTournament } from '#lib/server/auth/tournament.ts';
import { getModule } from '#lib/server/modules/registry.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import {
	checkIn,
	checkRequirements,
	getParticipant,
	listParticipants,
	register,
	unregister
} from '#lib/server/services/participants.ts';
import { listMatches } from '#lib/server/services/matches.ts';
import { getRequirements } from '#lib/server/services/tournaments.ts';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await loadTournament(event);
	const user = event.locals.user;
	const participants = await listParticipants(tournament.id);
	const me = user ? await getParticipant(tournament.id, user.id) : undefined;

	const requirements = user
		? (await checkRequirements(tournament.id, [user.id])).get(user.id)!
		: (await getRequirements(tournament.id)).map((r) => ({
				moduleId: r.moduleId,
				moduleName: getModule(r.moduleId)?.name ?? r.moduleId,
				status: 'missing' as const
			}));

	// Once play starts, the Overview summarises the bracket; the Bracket tab draws it.
	const sheet =
		tournament.status === 'running' || tournament.status === 'completed'
			? await loadSheet(tournament, user?.id)
			: null;
	const items = sheet ? await listMatches(sheet.stages) : [];
	const names = new Map(participants.map((p) => [p.id, p.displayName]));
	const entrantNames = (entrants: (string | null | undefined)[]) =>
		entrants.map((id) => (id ? (names.get(id) ?? '?') : id)) as [
			string | null | undefined,
			string | null | undefined
		];

	// The viewer's next match: one to play now, else the next one they wait for.
	let next = null;
	if (me && sheet && tournament.status === 'running') {
		const mine = items.filter((match) => match.entrants.includes(me.id));
		const now = mine.find((match) => ['ready', 'reported', 'disputed'].includes(match.progress));
		const match = now ?? mine.find((match) => match.progress === 'waiting');
		if (match) {
			next = {
				id: match.id,
				number: match.number,
				stageIndex: match.stageIndex,
				stageCount: match.stageCount,
				progress: match.progress,
				// A single report shows on the plate as pending pips, as in the match room.
				reported: match.reports.length === 1 ? match.reports[0].scores : null,
				side: match.entrants.indexOf(me.id) as 0 | 1,
				entrants: entrantNames(match.entrants)
			};
		}
	}

	// The stage being played (or the last one played): how far it is, and what is being played now,
	// disputes first. Byes and skipped matches are not games, so they are not counted.
	const stage =
		sheet &&
		(sheet.stages.find((s) => s.status === 'running') ??
			sheet.stages.findLast((s) => s.status !== 'pending'));
	let bracket = null;
	if (sheet && stage) {
		const played = items.filter(
			(item) => item.stageIndex === stage.index && !['bye', 'skipped'].includes(item.status)
		);
		const order: Record<string, number> = { disputed: 0, reported: 1, ready: 2 };
		const live = played
			.filter((item) => item.progress in order)
			.sort((a, b) => order[a.progress] - order[b.progress] || a.number - b.number);
		bracket = {
			stageIndex: stage.index,
			stageCount: sheet.stages.length,
			type: stage.type,
			done: played.filter((item) => item.status === 'completed').length,
			total: played.length,
			liveCount: live.length,
			live: live.slice(0, 6).map((item) => ({
				id: item.id,
				number: item.number,
				progress: item.progress,
				entrants: entrantNames(item.entrants),
				me: sheet.me ? item.entrants.indexOf(sheet.me) : -1
			}))
		};
	}

	return {
		description: tournament.description,
		limit: tournament.participantLimit,
		next,
		bracket,
		full:
			tournament.participantLimit !== null && participants.length >= tournament.participantLimit,
		me: me && { checkedIn: Boolean(me.checkedInAt), finalRank: me.finalRank },
		requirements,
		participants: participants.map((p) => ({
			id: p.id,
			username: p.username,
			displayName: p.displayName,
			avatarUrl: p.avatarUrl,
			finalRank: p.finalRank
		}))
	};
};

async function act(event: RequestEvent, run: typeof register) {
	const user = requireUser(event);
	const { tournament } = await loadTournament(event);
	try {
		await run(tournament, user.id);
	} catch (e) {
		if (e instanceof ServiceError) return fail(400, { error: e.message });
		throw e;
	}
}

export const actions: Actions = {
	register: (event) => act(event, register),
	leave: (event) => act(event, unregister),
	checkIn: (event) => act(event, checkIn)
};
