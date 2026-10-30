import type { Cookies } from '@sveltejs/kit';

const FLASH_COOKIE = 'flash';

/** Stores a one-time message for the next page load, e.g. a sign-in error after a redirect. */
export function setFlash(cookies: Cookies, message: string) {
	cookies.set(FLASH_COOKIE, encodeURIComponent(message), { path: '/', maxAge: 60 });
}

export function takeFlash(cookies: Cookies): string | null {
	const value = cookies.get(FLASH_COOKIE);
	if (!value) return null;
	cookies.delete(FLASH_COOKIE, { path: '/' });
	return decodeURIComponent(value);
}
