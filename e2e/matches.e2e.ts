import { expect, test, type Browser, type Locator, type Page } from '@playwright/test';
import {
	createOrganization,
	createTournament,
	playerPage,
	registerPlayers,
	signIn,
	uniqueName
} from './helpers';

/**
 * Starts a single elimination cup of four, organized from `page`. Seeds follow sign-up order, so
 * match #1 is p1–p4 and #2 is p2–p3.
 */
async function runningCup(page: Page, browser: Browser, prefix: string) {
	await signIn(page, uniqueName(`${prefix}o`));
	const orgSlug = await createOrganization(page, `Matches ${uniqueName(prefix)}`);
	const path = await createTournament(page, orgSlug, 'Match Cup');
	await page.getByRole('button', { name: 'Open registration' }).click();
	await expect(page.getByText('Registration is open.')).toBeVisible();
	const players = await registerPlayers(browser, path, `${prefix}p`, 4);
	await page.getByRole('button', { name: 'Start tournament' }).click();
	await expect(page.getByText('The tournament is being played.')).toBeVisible();
	return { path, players };
}

/** Signs in as `player` and opens the room of their first match from the matches page. */
async function openRoom(browser: Browser, path: string, player: string) {
	const page = await playerPage(browser, player);
	await page.goto(`${path}/matches`);
	await page.getByRole('region', { name: 'Your matches' }).getByRole('link').first().click();
	await expect(page.getByTestId('live')).toHaveText('Live');
	return page;
}

const score = (scope: Page | Locator, player: string) =>
	scope.getByLabel(`Score of ${player}`, { exact: true });

test('two players chat live, report and confirm', async ({ page, browser }) => {
	test.slow();
	const { path, players } = await runningCup(page, browser, 'mc');
	const [p1, , , p4] = players;

	await page.goto(`${path}/matches`);
	await expect(page.getByTestId('live')).toHaveText('Live');

	const one = await openRoom(browser, path, p1);
	await expect(one.getByRole('heading', { name: 'Match #1' })).toBeVisible();
	const four = await playerPage(browser, p4);
	await four.goto(one.url());
	await expect(four.getByTestId('live')).toHaveText('Live');

	// Messages show up in the other player's room without reloading.
	await one.getByLabel('Write a message').fill('Ready when you are');
	await one.getByRole('button', { name: 'Send' }).click();
	await expect(four.getByRole('log')).toContainText('Ready when you are');
	await four.getByLabel('Write a message').fill('Good luck!');
	await four.getByRole('button', { name: 'Send' }).click();
	await expect(one.getByRole('log')).toContainText('Good luck!');

	// p1 reports, p4 confirms, and the match is decided for everyone watching.
	await score(one, p1).fill('2');
	await score(one, p4).fill('1');
	await one.getByRole('button', { name: 'Report result' }).click();
	await expect(one.getByText(`You reported 2–1. Waiting for ${p4} to confirm.`)).toBeVisible();
	await expect(four.getByText(`${p1} reported 2–1.`)).toBeVisible();
	await four.getByRole('button', { name: 'Confirm', exact: true }).click();
	await expect(four.getByTestId('match-status')).toHaveText('Done');
	await expect(one.getByTestId('match-status')).toHaveText('Done');

	const id = new URL(one.url()).pathname.split('/').pop();
	await expect(page.getByTestId(`match-${id}`)).toContainText('Done');

	await page.goto(`${path}/bracket`);
	await expect(page.getByRole('group', { name: 'Match 3' })).toContainText(p1);
	await expect(page.locator('.placements')).toContainText(p4);

	await one.context().close();
	await four.context().close();
});

test('conflicting reports are disputed and resolved from the organizer queue', async ({
	page,
	browser
}) => {
	test.slow();
	const { path, players } = await runningCup(page, browser, 'md');
	const [p1, p2, , p4] = players;

	const two = await openRoom(browser, path, p2);
	await expect(two.getByRole('heading', { name: 'Match #2' })).toBeVisible();
	await two.getByRole('button', { name: 'Request organizer help' }).click();
	await expect(two.getByText('An organizer has been asked to help.')).toBeVisible();

	// The players report different scores.
	const one = await openRoom(browser, path, p1);
	const four = await openRoom(browser, path, p4);
	await score(one, p1).fill('2');
	await score(one, p4).fill('0');
	await one.getByRole('button', { name: 'Report result' }).click();
	await expect(four.getByText(`${p1} reported 2–0.`)).toBeVisible();
	await four.getByRole('button', { name: 'Report a different score' }).click();
	await score(four, p1).fill('0');
	await score(four, p4).fill('2');
	await four.getByRole('button', { name: 'Report result' }).click();
	await expect(four.getByTestId('match-status')).toHaveText('Disputed');
	await expect(one.getByTestId('match-status')).toHaveText('Disputed');
	await expect(
		one.getByText("The reports don't match, so an organizer will decide the result.")
	).toBeVisible();
	// Only the result card says so, not a second alert after the report.
	await expect(
		four.getByText("The reports don't match, so an organizer will decide the result.")
	).toHaveCount(1);

	// The dispute comes first in the organizer's queue, then the help request.
	await page.goto(`${path}/admin/matches`);
	const queue = page.locator('[data-testid^="queue-"]');
	await expect(queue.nth(0)).toContainText('Match #1');
	await expect(queue.nth(0)).toContainText('Disputed');
	await expect(queue.nth(0)).toContainText(`${p1} reported 2–0.`);
	await expect(queue.nth(1)).toContainText('Match #2');
	await expect(queue.nth(1)).toContainText('Help requested');

	await score(queue.nth(0), p1).fill('2');
	await score(queue.nth(0), p4).fill('0');
	await queue.nth(0).getByRole('button', { name: 'Save' }).click();
	await expect(queue.nth(0)).toContainText('Match #2');
	await expect(one.getByTestId('match-status')).toHaveText('Done');
	await expect(one.getByText('An organizer set this result.')).toBeVisible();

	// The organizer answers in the room of the match that asked for help.
	await queue.nth(0).getByRole('link', { name: 'Open match room' }).click();
	await expect(page.getByRole('heading', { name: 'Match #2' })).toBeVisible();
	await page.getByLabel('Write a message').fill('How can I help?');
	await page.getByRole('button', { name: 'Send' }).click();
	const message = two.getByRole('log').getByRole('listitem').filter({ hasText: 'How can I help?' });
	await expect(message.getByText('Organizer', { exact: true })).toBeVisible();
	// Messages only reach the room of their match.
	await expect(one.getByRole('log')).not.toContainText('How can I help?');

	await page.goto(`${path}/admin/matches`);
	await queue.nth(0).getByRole('button', { name: 'Mark help as handled' }).click();
	await expect(queue.nth(0)).toContainText('Match #2');
	await expect(queue.nth(0)).not.toContainText('Help requested');

	for (const player of [one, two, four]) await player.context().close();
});
