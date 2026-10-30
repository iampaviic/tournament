import { describe, expect, it } from 'vitest';
import { resolveInstanceAuth, type ModuleFactories } from './config';
import type { AuthModule } from './types';

const stub = (id: string): AuthModule => ({
	id,
	name: id,
	createAuthorizationURL: () => new URL('http://example.com'),
	handleCallback: async () => ({ providerUserId: '1', username: 'x', data: {} })
});

const factories: ModuleFactories = {
	dev: () => stub('dev'),
	discord: () => stub('discord'),
	tetrio: () => {
		throw new Error('DISCORD_CLIENT_ID must be set');
	}
};

describe('resolveInstanceAuth', () => {
	it('builds enabled modules in order and records trusted ones', () => {
		const auth = resolveInstanceAuth(
			{ enabled: ['discord', 'dev'], trusted: ['discord'], allowDev: true },
			factories
		);
		expect(auth.modules.map((m) => m.id)).toEqual(['discord', 'dev']);
		expect([...auth.trusted]).toEqual(['discord']);
	});

	it('only builds enabled modules, so others need no secrets', () => {
		expect(() =>
			resolveInstanceAuth({ enabled: ['discord'], trusted: [], allowDev: false }, factories)
		).not.toThrow();
		expect(() =>
			resolveInstanceAuth({ enabled: ['tetrio'], trusted: [], allowDev: false }, factories)
		).toThrow('DISCORD_CLIENT_ID');
	});

	it.each([
		[{ enabled: [], trusted: [], allowDev: true }, 'at least one'],
		[{ enabled: ['steam'], trusted: [], allowDev: true }, 'unknown module "steam"'],
		[{ enabled: ['discord'], trusted: ['dev'], allowDev: true }, 'not listed in AUTH_MODULES'],
		[{ enabled: ['dev'], trusted: [], allowDev: false }, 'disabled in production']
	])('rejects misconfiguration %#', (settings, message) => {
		expect(() => resolveInstanceAuth(settings, factories)).toThrow(message);
	});
});
