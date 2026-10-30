import { expect, test, type Locator } from '@playwright/test';
import {
	adminTab,
	createOrganization,
	createTournament,
	playReadyMatches,
	registerPlayers,
	signIn,
	uniqueName
} from './helpers';

const transform = (content: Locator) => content.evaluate((el) => getComputedStyle(el).transform);

test('shows brackets on a canvas that pans, zooms and switches themes', async ({
	page,
	browser
}) => {
	test.slow();
	await signIn(page, uniqueName('bo'));
	const orgSlug = await createOrganization(page, `Brackets ${uniqueName('b')}`);
	const path = await createTournament(page, orgSlug, 'Double Cup');

	// A Swiss group stage, then everyone into double elimination.
	await adminTab(page, 'Structure').click();
	await page.getByLabel('Group stage, then final stage').check();
	await page.locator('select[name="s0.type"]').selectOption('swiss');
	await page.locator('input[name="s0.groupCount"]').fill('1');
	await page.locator('input[name="s0.advancePerGroup"]').fill('4');
	await page.locator('select[name="s1.type"]').selectOption('double_elimination');
	await page.getByRole('button', { name: 'Save structure' }).click();
	await expect(page.getByText('Structure saved.')).toBeVisible();
	await page.getByRole('button', { name: 'Open registration' }).click();
	await registerPlayers(browser, path, 'bp', 4);

	await page.getByRole('button', { name: 'Start tournament' }).click();
	await expect(page.getByText('The tournament is being played.')).toBeVisible();
	await adminTab(page, 'Matches').click();
	await playReadyMatches(page);
	await page.getByRole('button', { name: 'Start final stage' }).click();
	await expect(page.getByRole('heading', { name: 'Final stage' })).toBeVisible();

	await page.goto(`${path}/bracket`);
	const swiss = page.getByRole('region', { name: 'Group stage bracket' });
	const final = page.getByRole('region', { name: 'Final stage bracket' });
	// Two Swiss rounds of two matches; winners bracket 3, losers bracket 2, grand final and reset.
	await expect(swiss.getByTestId('bracket-match')).toHaveCount(4);
	await expect(final.getByTestId('bracket-match')).toHaveCount(7);
	for (const title of ['Winners final', 'Losers final', 'Grand final', 'Bracket reset']) {
		await expect(final.getByText(title, { exact: true })).toBeVisible();
	}
	await expect(final.getByText('Loser of #1')).toBeVisible();

	// Zooming and dragging move the canvas.
	const content = final.getByTestId('bracket-content');
	const initial = await transform(content);
	await page.getByRole('button', { name: 'Zoom out' }).nth(1).click();
	await expect.poll(() => transform(content)).not.toBe(initial);
	const zoomed = await transform(content);
	const box = (await final.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 + 30, { steps: 5 });
	await page.mouse.up();
	await expect.poll(() => transform(content)).not.toBe(zoomed);

	// The organizer switches to the TETR.IO theme.
	await expect(page.locator('[data-theme="default"]')).toHaveCount(2);
	await page.goto(`${path}/admin/theme`);
	await page.getByLabel('TETR.IO').check();
	await page.getByRole('button', { name: 'Save theme' }).click();
	await expect(page.getByText('Theme saved.')).toBeVisible();
	await page.goto(`${path}/bracket`);
	await expect(page.locator('[data-theme="tetrio"]')).toHaveCount(2);
});
