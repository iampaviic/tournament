import { building, dev } from '$app/env';
import {
	ALLOW_DEV_AUTH,
	AUTH_MODULES,
	DISCORD_CLIENT_ID,
	DISCORD_CLIENT_SECRET,
	TRUSTED_AUTH_MODULES
} from '$app/env/private';
import { devModule } from './auth/dev';
import { discordModule } from './auth/discord';
import { tetrioModule } from './auth/tetrio';
import { requireSetting, resolveInstanceAuth, type ModuleFactories } from './config';
import type { AuthModule } from './types';

const discordOptions = (moduleId: string) => ({
	clientId: requireSetting(DISCORD_CLIENT_ID, 'DISCORD_CLIENT_ID', moduleId),
	clientSecret: requireSetting(DISCORD_CLIENT_SECRET, 'DISCORD_CLIENT_SECRET', moduleId)
});

/** Every auth module installed in this build. Add new modules here. */
const installed: ModuleFactories = {
	dev: devModule,
	discord: () => discordModule(discordOptions('discord')),
	tetrio: () => tetrioModule(discordOptions('tetrio'))
};

// Resolved at startup so misconfiguration fails fast; skipped while building, when no env is set.
const instance = building
	? { modules: [], trusted: new Set<string>() }
	: resolveInstanceAuth(
			{ enabled: AUTH_MODULES, trusted: TRUSTED_AUTH_MODULES, allowDev: dev || ALLOW_DEV_AUTH },
			installed
		);

/** Enabled modules, in login page order. */
export function listModules(): AuthModule[] {
	return instance.modules;
}

export function getModule(id: string): AuthModule | undefined {
	return instance.modules.find((module) => module.id === id);
}

/** Whether signing in with this module grants access to admin interfaces. */
export function isTrusted(moduleId: string): boolean {
	return instance.trusted.has(moduleId);
}
