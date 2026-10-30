import { expect, type Page } from '@playwright/test';

/** A username that is unique across test runs, since the e2e database is kept between them. */
export const uniqueName = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

export async function signIn(page: Page, username: string) {
	await page.goto('/login');
	await page.getByLabel('Username').fill(username);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/dashboard');
}
