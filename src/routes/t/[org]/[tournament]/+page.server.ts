import { fail } from '@sveltejs/kit';
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

	return {
		description: tournament.description,
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
