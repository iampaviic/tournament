import { expect, test } from '@playwright/test';
import { uniqueName } from './helpers';

test('sign in, edit the profile and sign out', async ({ page }) => {
	const username = uniqueName('e2e');

	await page.goto('/dashboard');
	await expect(page).toHaveURL('/login?next=%2Fdashboard');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await page.getByLabel('Username').fill(username);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/dashboard');
	await expect(page.getByRole('heading', { name: `Welcome, ${username}!` })).toBeVisible();

	await page.getByRole('link', { name: 'Settings' }).click();
	await page.getByLabel('Display name').fill('E2E Player');
	await page.getByLabel('About you').fill('Testing the platform.');
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page.getByText('Profile saved.')).toBeVisible();

	await page.getByRole('link', { name: 'Connected accounts' }).click();
	await expect(page.getByText(`Linked as ${username}`)).toBeVisible();

	await page.goto(`/u/${username}`);
	await expect(page.getByRole('heading', { name: 'E2E Player' })).toBeVisible();
	await expect(page.getByText('Testing the platform.')).toBeVisible();

	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL('/');
	await page.goto('/settings');
	await expect(page).toHaveURL('/login?next=%2Fsettings');
});

test('the first Tab focuses the skip link', async ({ page }) => {
	await page.goto('/');
	await page.keyboard.press('Tab');
	await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('main')).toBeFocused();
});

test('shows sign-in errors on the login page', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Username').fill('x');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL('/login');
	await expect(page.getByRole('alert')).toContainText('Username must be 3–32 characters');
});
