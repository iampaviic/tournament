import { AuthModuleError, type AuthModule } from '../types';

const USERNAME = /^[a-z0-9_-]{3,32}$/;

/**
 * Signs in as any username without a password. Only for local development and e2e tests:
 * the registry refuses it in production builds unless `ALLOW_DEV_AUTH=true`.
 */
export function devModule(): AuthModule {
	return {
		id: 'dev',
		name: 'Development login',
		createAuthorizationURL({ state, redirectUri, requestUrl }) {
			const username = requestUrl.searchParams.get('username')?.trim().toLowerCase() ?? '';
			const url = new URL(redirectUri);
			url.searchParams.set('state', state);
			url.searchParams.set('username', username);
			return url;
		},
		async handleCallback({ url }) {
			const username = url.searchParams.get('username') ?? '';
			if (!USERNAME.test(username)) {
				throw new AuthModuleError(
					'Username must be 3–32 characters: lowercase letters, digits, - or _.'
				);
			}
			return { providerUserId: username, username, displayName: username, data: {} };
		}
	};
}
