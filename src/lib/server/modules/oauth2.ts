import { createHash, randomBytes } from 'node:crypto';
import { AuthModuleError, type AuthorizationRequest, type CallbackRequest } from './types';

/** Authorization code flow with PKCE (RFC 6749 + RFC 7636). */
export interface OAuth2Provider {
	authorizeUrl: string;
	tokenUrl: string;
	clientId: string;
	clientSecret: string;
	scopes: string[];
}

export interface OAuth2Tokens {
	access_token: string;
	token_type: string;
	expires_in?: number;
	refresh_token?: string;
	scope?: string;
}

/** A PKCE code verifier: 43 characters from the unreserved set. */
export function generateCodeVerifier(): string {
	return randomBytes(32).toString('base64url');
}

export function codeChallenge(codeVerifier: string): string {
	return createHash('sha256').update(codeVerifier).digest('base64url');
}

export function createAuthorizationURL(provider: OAuth2Provider, request: AuthorizationRequest) {
	const url = new URL(provider.authorizeUrl);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', provider.clientId);
	url.searchParams.set('redirect_uri', request.redirectUri);
	url.searchParams.set('scope', provider.scopes.join(' '));
	url.searchParams.set('state', request.state);
	url.searchParams.set('code_challenge', codeChallenge(request.codeVerifier));
	url.searchParams.set('code_challenge_method', 'S256');
	return url;
}

/** Exchanges the callback's authorization code for tokens. */
export async function exchangeCode(
	provider: OAuth2Provider,
	request: CallbackRequest,
	fetch: typeof globalThis.fetch
): Promise<OAuth2Tokens> {
	const error = request.url.searchParams.get('error');
	if (error === 'access_denied') throw new AuthModuleError('Sign-in was cancelled.');
	if (error) throw new AuthModuleError(`The provider returned an error: ${error}.`);

	const code = request.url.searchParams.get('code');
	if (!code) throw new AuthModuleError('The provider did not return an authorization code.');

	const response = await fetch(provider.tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json'
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: request.redirectUri,
			code_verifier: request.codeVerifier,
			client_id: provider.clientId,
			client_secret: provider.clientSecret
		})
	});
	if (!response.ok) {
		throw new AuthModuleError(`Could not verify the sign-in (status ${response.status}).`);
	}
	const tokens = (await response.json()) as OAuth2Tokens;
	if (!tokens.access_token)
		throw new AuthModuleError('The provider did not return an access token.');
	return tokens;
}
