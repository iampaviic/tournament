import { expect, test, type Page } from '@playwright/test';
import {
	adminTab,
	createOrganization,
	createTournament,
	playerPage,
	playReadyMatches,
	registerPlayers,
	signIn,
	uniqueName
} from './helpers';

const results = (page: Page) => page.getByRole('region', { name: 'Results' });
const activity = (page: Page) => page.getByRole('region', { name: 'Activity' });

test('profiles show results and activity unless hidden', async ({ page, browser }) => {
	test.slow();
	await signIn(page, uniqueName('pfo'));
	const orgSlug = await createOrganization(page, `Profiles ${uniqueName('pf')}`);

	// Played to the end: p1 is the first seed and wins every match 2–0.
	const path = await createTournament(page, orgSlug, 'Profile Cup');
	await page.getByRole('button', { name: 'Open registration' }).click();
	await expect(page.getByText('Registration is open.')).toBeVisible();
	const [p1] = await registerPlayers(browser, path, 'pf', 4);
	await page.getByRole('button', { name: 'Start tournament' }).click();
	await expect(page.getByText('The tournament is being played.')).toBeVisible();
	await adminTab(page, 'Matches').click();
	await playReadyMatches(page);
	await expect(page.getByText('The tournament is finished.')).toBeVisible();

	// Not started yet: p1 is registered.
	const nextPath = await createTournament(page, orgSlug, 'Next Cup');
	await page.getByRole('button', { name: 'Open registration' }).click();
	await expect(page.getByText('Registration is open.')).toBeVisible();
	const player = await playerPage(browser, p1);
	await player.goto(nextPath);
	await player.getByRole('button', { name: 'Register' }).click();
	await expect(player.getByText("You're registered.")).toBeVisible();

	await page.goto(`/u/${p1}`);
	const row = results(page).getByRole('row', { name: /Profile Cup/ });
	await expect(row).toContainText('#1');
	await expect(row).toContainText('2–0–0');
	await expect(row.getByRole('link', { name: 'Matches of Profile Cup' })).toBeVisible();
	await expect(activity(page)).toContainText('Next Cup');

	const visitor = await (
		await browser.newContext({ extraHTTPHeaders: { 'X-Forwarded-Proto': 'http' } })
	).newPage();

	/** Unchecks a profile setting as p1: p1 still sees `shown`, everyone else `hidden` instead. */
	async function hide(
		label: string,
		section: typeof results,
		{ shown, hidden }: { shown: string; hidden: string }
	) {
		await player.goto('/settings');
		await player.getByLabel(label).uncheck();
		await player.getByRole('button', { name: 'Save' }).click();
		await expect(player.getByText('Profile saved.')).toBeVisible();

		await player.goto(`/u/${p1}`);
		await expect(section(player)).toContainText(shown);
		await expect(section(player)).toContainText('Hidden from others.');
		await expect(
			section(player).getByRole('link', { name: 'Change this in settings' })
		).toBeVisible();

		for (const other of [page, visitor]) {
			await other.goto(`/u/${p1}`);
			await expect(section(other)).toContainText(hidden);
			await expect(section(other)).not.toContainText(shown);
		}
	}

	await hide('Show my results on my public profile', results, {
		shown: 'Profile Cup',
		hidden: 'This user keeps their results private.'
	});
	await hide("Show the tournaments I'm registered for and my organizations", activity, {
		shown: 'Next Cup',
		hidden: 'This user keeps their tournaments and organizations private.'
	});

	await visitor.context().close();
	await player.context().close();
});
