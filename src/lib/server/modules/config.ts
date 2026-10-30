import type { AuthModule } from './types';

export interface InstanceAuthSettings {
	/** Module ids from `AUTH_MODULES`, in the order they appear on the login page. */
	enabled: string[];
	/** Module ids from `TRUSTED_AUTH_MODULES`. */
	trusted: string[];
	/** Whether the insecure `dev` module may be enabled. */
	allowDev: boolean;
}

export interface InstanceAuth {
	modules: AuthModule[];
	trusted: Set<string>;
}

/** Module id → factory. Factories run only for enabled modules, so unused ones need no secrets. */
export type ModuleFactories = Record<string, () => AuthModule>;

/** Validates the instance's auth settings and builds the enabled modules. Throws on misconfiguration. */
export function resolveInstanceAuth(
	settings: InstanceAuthSettings,
	factories: ModuleFactories
): InstanceAuth {
	const installed = Object.keys(factories).join(', ');
	if (settings.enabled.length === 0) {
		throw new Error(`AUTH_MODULES must list at least one auth module (installed: ${installed}).`);
	}
	for (const id of settings.enabled) {
		if (!(id in factories)) {
			throw new Error(`AUTH_MODULES: unknown module "${id}" (installed: ${installed}).`);
		}
	}
	for (const id of settings.trusted) {
		if (!settings.enabled.includes(id)) {
			throw new Error(`TRUSTED_AUTH_MODULES: "${id}" is not listed in AUTH_MODULES.`);
		}
	}
	if (settings.enabled.includes('dev') && !settings.allowDev) {
		throw new Error(
			'The dev auth module lets anyone sign in as anyone and is disabled in production. ' +
				'Remove it from AUTH_MODULES (or set ALLOW_DEV_AUTH=true for e2e tests only).'
		);
	}

	const modules = [...new Set(settings.enabled)].map((id) => {
		const module = factories[id]();
		if (module.id !== id) throw new Error(`Auth module "${id}" reports id "${module.id}".`);
		return module;
	});
	return { modules, trusted: new Set(settings.trusted) };
}

/** Reads a required secret for an enabled module. */
export function requireSetting(value: string | undefined, name: string, moduleId: string): string {
	if (!value) throw new Error(`${name} must be set to enable the "${moduleId}" auth module.`);
	return value;
}
