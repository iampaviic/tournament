import { fail } from '@sveltejs/kit';
import { requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import {
	addParticipant,
	checkRequirements,
	listParticipants,
	moveParticipant,
	removeParticipant,
	setCheckedIn,
	shuffleSeeds
} from '#lib/server/services/participants.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await requireTournamentAdmin(event);
	const list = await listParticipants(tournament.id);
	const checks = await checkRequirements(
		tournament.id,
		list.map((p) => p.userId)
	);
	return {
		participants: list.map((p) => ({
			...p,
			problems: checks
				.get(p.userId)!
				.filter((check) => check.status !== 'ok')
				.map((check) =>
					check.status === 'ineligible'
						? check.reason
						: m.participants_missing({ module: check.moduleName })
				)
		}))
	};
};

/** Runs an organizer change, turning rule violations into form errors. */
async function change(
	event: RequestEvent,
	run: (
		tournament: Awaited<ReturnType<typeof requireTournamentAdmin>>['tournament'],
		form: FormData
	) => Promise<string | void>
) {
	const { tournament } = await requireTournamentAdmin(event);
	const form = await event.request.formData();
	try {
		const message = await run(tournament, form);
		return message ? { message } : undefined;
	} catch (e) {
		if (e instanceof ServiceError) return fail(400, { error: e.message });
		throw e;
	}
}

const id = (form: FormData) => String(form.get('participantId'));

export const actions: Actions = {
	add: (event) =>
		change(event, async (tournament, form) => {
			const username = String(form.get('username') ?? '').trim();
			await addParticipant(tournament, username);
			return m.participants_added({ username });
		}),
	remove: (event) => change(event, (tournament, form) => removeParticipant(tournament, id(form))),
	up: (event) => change(event, (tournament, form) => moveParticipant(tournament, id(form), -1)),
	down: (event) => change(event, (tournament, form) => moveParticipant(tournament, id(form), 1)),
	checkIn: (event) =>
		change(event, (tournament, form) =>
			setCheckedIn(tournament, id(form), form.get('checkedIn') === 'true')
		),
	shuffle: (event) => change(event, (tournament) => shuffleSeeds(tournament))
};
