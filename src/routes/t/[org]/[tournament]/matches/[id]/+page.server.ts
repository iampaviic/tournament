import { error, fail } from '@sveltejs/kit';
import type { z } from 'zod';
import { requireUser } from '#lib/server/auth/guards.ts';
import { loadTournament, requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { listMessages, messageSchema, postMessage } from '#lib/server/services/chat.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import {
	clearHelp,
	clearMatchResult,
	getMatch,
	matchIdSchema,
	reportResult,
	requestHelp,
	scoresSchema,
	setMatchResult
} from '#lib/server/services/matches.ts';
import { listParticipants } from '#lib/server/services/participants.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament, isMember } = await loadTournament(event);
	const id = matchIdSchema.safeParse(event.params.id);
	const match = id.success ? await getMatch(tournament.id, id.data) : undefined;
	if (!match) error(404, 'Match not found');

	const user = event.locals.user;
	const participants = await listParticipants(tournament.id);
	const me = user ? participants.find((p) => p.userId === user.id) : undefined;
	const slot = me ? match.entrants.indexOf(me.id) : -1;
	const side = slot === 0 || slot === 1 ? slot : null;
	const organizer = isMember && event.locals.trusted;
	const playing = tournament.status === 'running' && match.stageStatus === 'running';
	const active = ['ready', 'reported', 'disputed'].includes(match.progress);

	return {
		match,
		players: Object.fromEntries(
			participants
				.filter((p) => match.entrants.includes(p.id))
				.map((p) => [p.id, { name: p.displayName, avatarUrl: p.avatarUrl }])
		),
		/** The viewer's slot, or `null` if they aren't playing this match. */
		side,
		organizer,
		messages: await listMessages(match.id),
		canReport:
			playing && side !== null && (match.progress === 'ready' || match.progress === 'reported'),
		canHelp: playing && side !== null && active && !match.helpRequested,
		canSet:
			organizer &&
			match.stageStatus === 'running' &&
			(match.status === 'ready' || match.status === 'completed'),
		canPost: Boolean(user) && (side !== null || organizer)
	};
};

/** Parses form input; the first problem becomes the form error. */
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
	const result = schema.safeParse(value);
	if (!result.success) throw new ServiceError(result.error.issues[0].message);
	return result.data;
}

const scores = (form: FormData) =>
	parse(scoresSchema, { score1: form.get('score1'), score2: form.get('score2') });

/** Runs a change to the match, turning rule violations into form errors. */
async function act(
	event: RequestEvent,
	run: (matchId: string, form: FormData) => Promise<string | void>
) {
	const form = await event.request.formData();
	try {
		const message = await run(parse(matchIdSchema, event.params.id), form);
		return message ? { message } : undefined;
	} catch (e) {
		if (e instanceof ServiceError) return fail(400, { error: e.message });
		throw e;
	}
}

/** A signed-in viewer; organizers are members with a trusted session. */
async function viewer(event: RequestEvent) {
	const user = requireUser(event);
	const { tournament, isMember } = await loadTournament(event);
	return { user, tournament, organizer: isMember && event.locals.trusted };
}

export const actions: Actions = {
	report: (event) =>
		act(event, async (matchId, form) => {
			const { user, tournament } = await viewer(event);
			const outcome = await reportResult(tournament, matchId, user.id, scores(form));
			return { saved: m.room_saved, agreed: m.room_agreed, disputed: m.room_disputed }[outcome]();
		}),
	help: (event) =>
		act(event, async (matchId) => {
			const { user, tournament } = await viewer(event);
			await requestHelp(tournament, matchId, user.id);
		}),
	message: (event) =>
		act(event, async (matchId, form) => {
			const { user, tournament, organizer } = await viewer(event);
			const body = parse(messageSchema, form.get('body'));
			await postMessage(tournament, matchId, { userId: user.id, organizer }, body);
		}),
	override: (event) =>
		act(event, async (matchId, form) => {
			const { user, tournament } = await requireTournamentAdmin(event);
			await setMatchResult(tournament, matchId, scores(form), { userId: user.id });
			return m.matches_saved();
		}),
	clear: (event) =>
		act(event, async (matchId) => {
			const { tournament } = await requireTournamentAdmin(event);
			await clearMatchResult(tournament, matchId);
		}),
	clearHelp: (event) =>
		act(event, async (matchId) => {
			const { tournament } = await requireTournamentAdmin(event);
			await clearHelp(tournament, matchId);
		})
};
