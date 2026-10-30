import { createAuthorizationURL, exchangeCode, type OAuth2Provider } from '../oauth2';
import {
	AuthModuleError,
	type AuthModule,
	type CallbackRequest,
	type ExternalIdentity
} from '../types';

export interface DiscordOptions {
	clientId: string;
	clientSecret: string;
	fetch?: typeof globalThis.fetch;
}

interface DiscordUser {
	id: string;
	username: string;
	global_name: string | null;
	avatar: string | null;
}

export function discordProvider(options: DiscordOptions): OAuth2Provider {
	return {
		authorizeUrl: 'https://discord.com/oauth2/authorize',
		tokenUrl: 'https://discord.com/api/oauth2/token',
		clientId: options.clientId,
		clientSecret: options.clientSecret,
		scopes: ['identify']
	};
}

/** Signs the user in with Discord and returns their Discord account. */
export async function fetchDiscordUser(
	options: DiscordOptions,
	request: CallbackRequest
): Promise<DiscordUser> {
	const fetch = options.fetch ?? globalThis.fetch;
	const tokens = await exchangeCode(discordProvider(options), request, fetch);
	const response = await fetch('https://discord.com/api/users/@me', {
		headers: { Authorization: `Bearer ${tokens.access_token}` }
	});
	if (!response.ok) throw new AuthModuleError('Could not load your Discord account.');
	return (await response.json()) as DiscordUser;
}

export function discordIdentity(user: DiscordUser): ExternalIdentity {
	return {
		providerUserId: user.id,
		username: user.username,
		displayName: user.global_name ?? user.username,
		avatarUrl: user.avatar
			? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
			: undefined,
		data: {}
	};
}

export function discordModule(options: DiscordOptions): AuthModule {
	return {
		id: 'discord',
		name: 'Discord',
		createAuthorizationURL: (request) => createAuthorizationURL(discordProvider(options), request),
		handleCallback: async (request) => discordIdentity(await fetchDiscordUser(options, request))
	};
}
