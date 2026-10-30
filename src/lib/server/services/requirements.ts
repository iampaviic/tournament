import type { AuthModule, StoredIdentity } from '#lib/server/modules/types.ts';

export interface Requirement {
	moduleId: string;
	config: Record<string, unknown>;
}

export type RequirementCheck = { moduleId: string; moduleName: string } & (
	| { status: 'ok' }
	/** The user hasn't linked an account on this platform. */
	| { status: 'missing' }
	| { status: 'ineligible'; reason: string }
	/** The module isn't enabled on this instance any more, so nobody can meet the requirement. */
	| { status: 'unavailable' }
);

/** Checks a user's linked identities against a tournament's requirements. */
export function evaluateRequirements(
	requirements: Requirement[],
	identities: (StoredIdentity & { moduleId: string })[],
	getModule: (id: string) => AuthModule | undefined
): RequirementCheck[] {
	return requirements.map(({ moduleId, config }) => {
		const module = getModule(moduleId);
		if (!module) return { moduleId, moduleName: moduleId, status: 'unavailable' };
		const base = { moduleId, moduleName: module.name };

		const identity = identities.find((i) => i.moduleId === moduleId);
		if (!identity) return { ...base, status: 'missing' };
		if (!module.checkEligibility) return { ...base, status: 'ok' };

		const parsed = module.tournamentConfig ? module.tournamentConfig.safeParse(config) : null;
		const eligibility = module.checkEligibility(identity, parsed?.success ? parsed.data : config);
		return eligibility.ok
			? { ...base, status: 'ok' }
			: { ...base, status: 'ineligible', reason: eligibility.reason };
	});
}

/**
 * Reads a module's tournament options from a form, using field names `<prefix><key>`.
 * Empty selects and numbers are left out, so the module's defaults apply.
 */
export function readModuleConfig(
	module: AuthModule,
	form: FormData,
	prefix: string
): { ok: true; config: Record<string, unknown> } | { ok: false; error: string } {
	const raw: Record<string, unknown> = {};
	for (const field of module.configFields ?? []) {
		const value = form.get(prefix + field.key);
		if (field.type === 'checkbox') raw[field.key] = value !== null;
		else if (typeof value === 'string' && value.trim() !== '') {
			raw[field.key] = field.type === 'number' ? Number(value) : value;
		}
	}
	return parseModuleConfig(module, raw);
}

/** Checks a module's tournament options with its `tournamentConfig`. */
export function parseModuleConfig(
	module: AuthModule,
	raw: Record<string, unknown>
): { ok: true; config: Record<string, unknown> } | { ok: false; error: string } {
	if (!module.tournamentConfig) return { ok: true, config: raw };
	const parsed = module.tournamentConfig.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, error: `${module.name}: ${parsed.error.issues[0].message}` };
	}
	return { ok: true, config: parsed.data as Record<string, unknown> };
}

/** Checks requirements sent to the REST API: enabled modules, each once, with valid options. */
export function parseRequirements(
	input: Requirement[],
	modules: AuthModule[]
): { ok: true; requirements: Requirement[] } | { ok: false; error: string } {
	const requirements: Requirement[] = [];
	for (const { moduleId, config } of input) {
		const module = modules.find((m) => m.id === moduleId);
		if (!module) return { ok: false, error: `There is no auth module called "${moduleId}".` };
		if (requirements.some((r) => r.moduleId === moduleId)) {
			return { ok: false, error: `${module.name} is required twice.` };
		}
		const parsed = parseModuleConfig(module, config);
		if (!parsed.ok) return parsed;
		requirements.push({ moduleId, config: parsed.config });
	}
	return { ok: true, requirements };
}
