import { expect, type Browser, type Page } from '@playwright/test';

/** A username that is unique across test runs, since the e2e database is kept between them. */
export const uniqueName = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

export async function signIn(page: Page, username: string) {
	await page.goto('/login');
	await page.getByLabel('Username').fill(username);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/dashboard');
}

/** Creates an organization and returns its slug. Ends on its admin page. */
export async function createOrganization(page: Page, name: string) {
	await page.goto('/organizations/new');
	await page.getByLabel('Name').fill(name);
	await page.getByRole('button', { name: 'Create organization' }).click();
	await expect(page).toHaveURL(/^[^?]*\/o\/[^/]+\/admin$/);
	return new URL(page.url()).pathname.split('/')[2];
}

/** Creates a tournament and returns its public path. Ends on its admin page. */
export async function createTournament(page: Page, orgSlug: string, name: string) {
	await page.goto(`/o/${orgSlug}/admin/tournaments`);
	await page.getByLabel('Name').fill(name);
	await page.getByRole('button', { name: 'Create tournament' }).click();
	await expect(page).toHaveURL(/\/admin$/);
	return new URL(page.url()).pathname.replace(/\/admin$/, '');
}

/** Creates an API key on the organization's API keys tab and returns it. */
export async function createApiKey(page: Page, orgSlug: string, name: string) {
	await page.goto(`/o/${orgSlug}/admin/api-keys`);
	await page.getByLabel('Name', { exact: true }).fill(name);
	await page.getByRole('button', { name: 'Create key' }).click();
	const key = page.getByTestId('new-api-key');
	await expect(key).toHaveText(/^tm_[0-9a-f]{8}_/);
	return (await key.textContent())!;
}

/** A tab of the tournament admin. */
export const adminTab = (page: Page, tab: string) =>
	page.getByRole('navigation', { name: 'Tournament admin' }).getByRole('link', { name: tab });

/** A page in a new browser context, signed in as `username`. Close it with `page.context().close()`. */
export async function playerPage(browser: Browser, username: string) {
	const context = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-Proto': 'http' } });
	const page = await context.newPage();
	await signIn(page, username);
	return page;
}

/** Signs up new users and registers each of them for the tournament at `path`. */
export async function registerPlayers(
	browser: Browser,
	path: string,
	prefix: string,
	count: number
) {
	const players = Array.from({ length: count }, (_, i) => uniqueName(`${prefix}${i + 1}`));
	for (const player of players) {
		const page = await playerPage(browser, player);
		await page.goto(path);
		await page.getByRole('button', { name: 'Register' }).click();
		await expect(page.getByText("You're registered.")).toBeVisible();
		await page.context().close();
	}
	return players;
}

/** Enters 2–0 for the first slot of every ready match on the admin matches page. */
export async function playReadyMatches(page: Page) {
	await expect(page.locator('li[data-testid^="match-"]').first()).toBeVisible();
	const ready = page.locator('li[data-testid^="match-"]', { hasText: 'Ready' });
	while ((await ready.count()) > 0) {
		const match = page.getByTestId((await ready.first().getAttribute('data-testid'))!);
		await match.locator('input[name="score1"]').fill('2');
		await match.locator('input[name="score2"]').fill('0');
		await match.getByRole('button', { name: 'Save' }).click();
		await expect(match).toContainText('Done');
	}
}
