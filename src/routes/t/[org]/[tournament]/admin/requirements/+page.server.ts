import { fail } from '@sveltejs/kit';
import { requireTournamentAdmin } from '#lib/server/auth/tournament.ts';
import { listModules } from '#lib/server/modules/registry.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { readModuleConfig, type Requirement } from '#lib/server/services/requirements.ts';
import { getRequirements, setRequirements } from '#lib/server/services/tournaments.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const { tournament } = await requireTournamentAdmin(event);
	const requirements = await getRequirements(tournament.id);
	return {
		modules: listModules().map((module) => {
			const requirement = requirements.find((r) => r.moduleId === module.id);
			return {
				id: module.id,
				name: module.name,
				fields: module.configFields?.() ?? [],
				required: Boolean(requirement),
				config: requirement?.config ?? {}
			};
		})
	};
};

export const actions: Actions = {
	default: async (event) => {
		const { tournament } = await requireTournamentAdmin(event);
		const form = await event.request.formData();
		const requirements: Requirement[] = [];
		for (const module of listModules()) {
			if (!form.has(`require.${module.id}`)) continue;
			const read = readModuleConfig(module, form, `${module.id}.`);
			if (!read.ok) return fail(400, { error: read.error });
			requirements.push({ moduleId: module.id, config: read.config });
		}
		try {
			await setRequirements(tournament, requirements);
		} catch (e) {
			if (e instanceof ServiceError) return fail(400, { error: e.message });
			throw e;
		}
		return { message: m.requirements_saved() };
	}
};
