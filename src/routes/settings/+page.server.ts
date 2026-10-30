import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireUser } from '#lib/server/auth/guards.ts';
import { profileSchema, updateProfile } from '#lib/server/services/users.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = (event) => {
	const user = requireUser(event);
	return {
		profile: {
			username: user.username,
			displayName: user.displayName,
			bio: user.bio,
			showResults: user.showResults,
			showActivity: user.showActivity
		}
	};
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireUser(event);
		const form = await event.request.formData();
		const values = {
			username: String(form.get('username') ?? ''),
			displayName: String(form.get('displayName') ?? ''),
			bio: String(form.get('bio') ?? ''),
			showResults: form.has('showResults'),
			showActivity: form.has('showActivity')
		};

		const parsed = profileSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: z.flattenError(parsed.error).fieldErrors });
		}
		if (!(await updateProfile(user.id, parsed.data))) {
			return fail(400, { values, errors: { username: [m.profile_username_taken()] } });
		}
		return { saved: true };
	}
};
