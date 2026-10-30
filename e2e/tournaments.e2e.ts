import { expect, test } from '@playwright/test';
import { adminTab, playReadyMatches, registerPlayers, signIn, uniqueName } from './helpers';

test('run a two-stage tournament from sign-up to champion', async ({ page, browser }) => {
	test.slow();
	const owner = uniqueName('to');
	const orgName = `League ${uniqueName('l')}`;
	const cup = 'Autumn Cup';

	await signIn(page, owner);
	await page.getByRole('link', { name: 'New organization' }).click();
	await page.getByLabel('Name').fill(orgName);
	await page.getByRole('button', { name: 'Create organization' }).click();
	await expect(page).toHaveURL(/^[^?]*\/o\/[^/]+\/admin$/);
	const orgSlug = new URL(page.url()).pathname.split('/')[2];

	await page
		.getByRole('navigation', { name: 'Organization admin' })
		.getByRole('link', { name: 'Tournaments' })
		.click();
	await expect(page).toHaveURL(`/o/${orgSlug}/admin/tournaments`);
	await page.getByLabel('Name').fill(cup);
	await page.getByRole('button', { name: 'Create tournament' }).click();
	await expect(page).toHaveURL(`/t/${orgSlug}/autumn-cup/admin`);
	const admin = (tab: string) => adminTab(page, tab);

	// Two round robin groups of three, the top two of each into a single elimination final stage.
	await admin('Structure').click();
	await expect(page).toHaveURL(/structure$/);
	await page.getByLabel('Group stage, then final stage').check();
	await page.locator('select[name="s0.type"]').selectOption('round_robin');
	await page.locator('input[name="s0.groupCount"]').fill('2');
	await page.locator('input[name="s0.advancePerGroup"]').fill('2');
	await page.locator('select[name="s1.type"]').selectOption('single_elimination');
	await page.getByRole('button', { name: 'Save structure' }).click();
	await expect(page.getByText('Structure saved.')).toBeVisible();

	await page.getByRole('button', { name: 'Open registration' }).click();
	await expect(page.getByText('Registration is open.')).toBeVisible();

	await registerPlayers(browser, `/t/${orgSlug}/autumn-cup`, 'pl', 6);

	await admin('Participants').click();
	await expect(page).toHaveURL(/participants$/);
	await expect(page.locator('ol li')).toHaveCount(6);

	await page.getByRole('button', { name: 'Start tournament' }).click();
	await expect(page.getByText('The tournament is being played.')).toBeVisible();

	await admin('Matches').click();
	await expect(page).toHaveURL(/matches$/);
	await playReadyMatches(page);
	await page.getByRole('button', { name: 'Start final stage' }).click();
	await expect(page.getByRole('heading', { name: 'Final stage' })).toBeVisible();
	await playReadyMatches(page);
	await expect(page.getByText('The tournament is finished.')).toBeVisible();

	await page.getByRole('link', { name: 'View public page' }).click();
	await expect(page.getByText('Completed')).toBeVisible();
	await page
		.getByRole('navigation', { name: 'Tournament' })
		.getByRole('link', { name: 'Bracket' })
		.click();
	await expect(page.getByRole('heading', { name: 'Group stage' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Group A' })).toBeVisible();
	const placings = page.locator('.placements li');
	await expect(placings).toHaveCount(4);
	await expect(placings.first()).toContainText('1');
});

test('registration checks the linked accounts a tournament requires', async ({ page, browser }) => {
	const owner = uniqueName('ro');
	await signIn(page, owner);
	await page.goto('/organizations/new');
	await page.getByLabel('Name').fill(`Req ${uniqueName('r')}`);
	await page.getByRole('button', { name: 'Create organization' }).click();
	await expect(page).toHaveURL(/^[^?]*\/o\/[^/]+\/admin$/);
	const orgSlug = new URL(page.url()).pathname.split('/')[2];
	await page.goto(`/o/${orgSlug}/admin/tournaments`);
	await page.getByLabel('Name').fill('Ranked Cup');
	await page.getByRole('button', { name: 'Create tournament' }).click();

	await page
		.getByRole('navigation', { name: 'Tournament admin' })
		.getByRole('link', { name: 'Requirements' })
		.click();
	await page.getByLabel('Development login — Required to register').check();
	await page.getByRole('button', { name: 'Save requirements' }).click();
	await expect(page.getByText('Requirements saved.')).toBeVisible();
	await page.getByRole('button', { name: 'Open registration' }).click();
	await expect(page.getByText('Registration is open.')).toBeVisible();

	// Signing in with the dev module links a dev account, so the requirement is met.
	const context = await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-Proto': 'http' } });
	const player = await context.newPage();
	await signIn(player, uniqueName('rp'));
	await player.goto(`/t/${orgSlug}/ranked-cup`);
	await expect(player.getByText('Development login account linked')).toBeVisible();
	await player.getByRole('button', { name: 'Register' }).click();
	await expect(player.getByText("You're registered.")).toBeVisible();
	await context.close();

	// With participants signed up, the tournament can't go back to being a hidden draft.
	await page.getByRole('button', { name: 'Back to draft' }).click();
	await expect(page.getByText('Participants have already signed up.')).toBeVisible();
});
