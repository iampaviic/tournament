import { expect, test, type BrowserContext } from '@playwright/test';
import { seedSteamApps } from './db';
import { createOrganization, createTournament, signIn, uniqueName } from './helpers';

const arena = { appId: 990001, name: 'E2E Tetris Arena' };
const deluxe = { appId: 990002, name: 'E2E Tetris Arena Deluxe' };

/** The game images come from Steam's CDN; no test reaches Steam. */
const offline = (context: BrowserContext) =>
	context.route('https://shared.akamai.steamstatic.com/**', (route) => route.abort());

test.beforeEach(async () => {
	await seedSteamApps([arena, deluxe]);
});

test('pick a Steam game with the combobox and show it', async ({ page, context }) => {
	await offline(context);
	await signIn(page, uniqueName('so'));
	const orgSlug = await createOrganization(page, `Steam ${uniqueName('s')}`);
	const cup = 'Arena Cup';
	const path = await createTournament(page, orgSlug, cup);
	const card = page.getByRole('region', { name: 'Game', exact: true });
	await expect(card).toContainText('No game set.');

	const search = page.getByRole('combobox', { name: 'Search Steam games' });
	await search.fill('E2E Tetris');
	await expect(page.getByRole('option', { name: deluxe.name, exact: true })).toBeVisible();
	await expect(page.getByRole('status').getByText('Games found: 2')).toBeAttached();
	await search.press('ArrowDown');
	await expect(page.getByRole('option', { name: arena.name, exact: true })).toHaveAttribute(
		'aria-selected',
		'true'
	);
	await search.press('Enter');
	await expect(page.getByText('Game saved.')).toBeVisible();
	await expect(card).toContainText(arena.name);
	await expect(card.getByRole('img', { name: `Artwork of ${arena.name}` })).toBeVisible();

	// Shown on the public page and in the organization's list.
	await page.getByRole('button', { name: 'Open registration' }).click();
	await expect(page.getByText('Registration is open.')).toBeVisible();
	await page.getByRole('link', { name: 'View public page' }).click();
	await expect(page).toHaveURL(path);
	await expect(page.getByText(arena.name, { exact: true })).toBeVisible();
	await expect(page.getByRole('img', { name: `Artwork of ${arena.name}` })).toBeVisible();

	await page.goto(`/o/${orgSlug}`);
	const listed = page.getByRole('listitem').filter({ hasText: cup });
	await expect(listed).toContainText(arena.name);
	await expect(listed.getByRole('img', { name: `Artwork of ${arena.name}` })).toBeVisible();

	await page.goto(`${path}/admin`);
	await card.getByRole('button', { name: 'Remove game' }).click();
	await expect(card).toContainText('No game set.');
	await expect(card).not.toContainText(arena.name);
});

test('pick a Steam game without JavaScript', async ({ browser }) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		extraHTTPHeaders: { 'X-Forwarded-Proto': 'http' }
	});
	await offline(context);
	const page = await context.newPage();
	await signIn(page, uniqueName('sn'));
	// Without JavaScript nothing suggests the addresses.
	const orgSlug = uniqueName('steam-n');
	await page.goto('/organizations/new');
	await page.getByLabel('Name').fill(`Steam ${orgSlug}`);
	await page.getByLabel('Address').fill(orgSlug);
	await page.getByRole('button', { name: 'Create organization' }).click();
	await expect(page).toHaveURL(`/o/${orgSlug}/admin`);
	await page.goto(`/o/${orgSlug}/admin/tournaments`);
	await page.getByLabel('Name').fill('Plain Cup');
	await page.getByLabel('Address').fill('plain-cup');
	await page.getByRole('button', { name: 'Create tournament' }).click();
	await expect(page).toHaveURL(`/t/${orgSlug}/plain-cup/admin`);

	await page.getByRole('textbox', { name: 'Search Steam games' }).fill('E2E Tetris');
	await page.getByRole('button', { name: 'Search', exact: true }).click();
	await expect(page).toHaveURL(/\/admin\?game=E2E\+Tetris$/);
	await page.getByRole('button', { name: `Pick ${arena.name}`, exact: true }).click();
	await expect(page.getByText('Game saved.')).toBeVisible();
	await expect(page.getByRole('region', { name: 'Game', exact: true })).toContainText(arena.name);
	await context.close();
});
