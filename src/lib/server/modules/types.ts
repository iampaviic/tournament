import type { z } from 'zod';

/** What an auth module reports about the account a user signed in with. */
export interface ExternalIdentity {
	/** Stable id on the external platform. Usernames can change, this must not. */
	providerUserId: string;
	username: string;
	displayName?: string;
	avatarUrl?: string;
	/** Module-specific profile data, stored as JSON (e.g. a tetr.io rank). */
	data: Record<string, unknown>;
}

/** An identity as stored in the database. */
export interface StoredIdentity extends ExternalIdentity {
	fetchedAt: Date;
}

export interface AuthorizationRequest {
	/** CSRF token; must come back unchanged on the callback URL. */
	state: string;
	/** PKCE code verifier; OAuth modules send its S256 challenge. */
	codeVerifier: string;
	/** Absolute URL of `/auth/[module]/callback`. */
	redirectUri: string;
	/** The URL of the request that started the flow, for modules that take extra input. */
	requestUrl: URL;
}

export interface CallbackRequest {
	/** The callback URL, including the provider's query parameters. */
	url: URL;
	codeVerifier: string;
	redirectUri: string;
}

export type Eligibility = { ok: true } | { ok: false; reason: string };

/** A field of the form organizers fill in to configure a module for a tournament. */
export type ConfigField = { key: string; label: string; hint?: string } & (
	| { type: 'select'; options: { value: string; label: string }[] }
	| { type: 'number'; min?: number; max?: number }
	| { type: 'checkbox' }
);

/**
 * An auth module adds a sign-in method and links users to their identity on another platform.
 * Modules are installed in `registry.ts` and enabled per instance with `AUTH_MODULES`.
 */
export interface AuthModule<Config = unknown> {
	id: string;
	name: string;
	/** Where to send the user to sign in. */
	createAuthorizationURL(request: AuthorizationRequest): URL | Promise<URL>;
	/** Completes the sign-in. Throws `AuthModuleError` with a message meant for the user. */
	handleCallback(request: CallbackRequest): Promise<ExternalIdentity>;
	/** Re-fetches profile data without the user signing in again. */
	refreshProfile?(identity: StoredIdentity): Promise<ExternalIdentity>;
	/** Minimum time between profile refreshes, to respect the platform's caching rules. */
	refreshInterval?: number;
	/** Options organizers can set when a tournament requires this module. */
	tournamentConfig?: z.ZodType<Config>;
	/**
	 * The form for `tournamentConfig`. Empty values are left out of the parsed object. Built per
	 * request, so labels follow the locale.
	 */
	configFields?(): ConfigField[];
	/** Decides whether a participant may join a tournament configured with `config`. */
	checkEligibility?(identity: StoredIdentity, config: Config): Eligibility;
	/** Short labelled values bracket themes can show next to a participant. */
	bracketFields?(identity: StoredIdentity): Record<string, string>;
}

/** A sign-in failure whose message can be shown to the user. */
export class AuthModuleError extends Error {
	override name = 'AuthModuleError';
}
