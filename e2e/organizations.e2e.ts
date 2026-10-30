import { expect, test } from '@playwright/test';
import { signIn, uniqueName } from './helpers';

test('create and manage an organization', async ({ page, browser }) => {
	const tab = (name: string) =>
		page.getByRole('navigation', { name: 'Organization admin' }).getByRole('link', { name });

	const owner = uniqueName('owner');
	const admin = uniqueName('admin');
	const name = `Club ${uniqueName('x')}`;

	// The future admin needs an account before they can be added.
	const other = await browser.newPage();
	await signIn(other, admin);
	await other.close();

	await signIn(page, owner);
	await page.getByRole('link', { name: 'New organization' }).click();
	await page.getByLabel('Name').fill(name);
	const slug = await page.getByLabel('Address').inputValue();
	expect(slug).toBe(name.toLowerCase().replace(/ /g, '-'));
	await page.getByLabel('Description').fill('We run weekly tournaments.');
	await page.getByRole('button', { name: 'Create organization' }).click();
	await expect(page).toHaveURL(`/o/${slug}/admin`);

	await page.getByRole('link', { name: 'View public page' }).click();
	await expect(page.getByRole('heading', { name })).toBeVisible();
	await expect(page.getByText('We run weekly tournaments.')).toBeVisible();
	await expect(page.getByText('No tournaments scheduled.')).toBeVisible();
	await page.getByRole('link', { name: 'Manage', exact: true }).click();

	await tab('Members').click();
	await expect(page).toHaveURL(`/o/${slug}/admin/members`);
	await page.getByLabel('Username').fill(admin);
	await page.getByRole('button', { name: 'Add member' }).click();
	await expect(page.getByText(`${admin} was added.`)).toBeVisible();
	await expect(page.getByRole('link', { name: admin, exact: true })).toBeVisible();

	await tab('API keys').click();
	await expect(page).toHaveURL(`/o/${slug}/admin/api-keys`);
	await page.getByLabel('Name', { exact: true }).fill('Discord bot');
	await page.getByRole('button', { name: 'Create key' }).click();
	await expect(page.getByTestId('new-api-key')).toHaveText(/^tm_[0-9a-f]{8}_/);
	await expect(page.getByText('Never used')).toBeVisible();
	await page.getByRole('button', { name: 'Revoke' }).click();
	await expect(page.getByText('No API keys yet.')).toBeVisible();

	await tab('Settings').click();
	await expect(page).toHaveURL(`/o/${slug}/admin`);
	await page.getByLabel('Address', { exact: true }).fill(`${slug}-renamed`);
	await page.getByRole('button', { name: 'Save' }).click();
	await expect(page).toHaveURL(`/o/${slug}-renamed/admin`);

	await page.getByLabel('Organization address').fill(`${slug}-renamed`);
	await page.getByRole('button', { name: 'Delete organization' }).click();
	await expect(page).toHaveURL('/dashboard');
	await expect(page.getByText("You're not a member of any organization yet.")).toBeVisible();
});

test('admin pages need membership', async ({ page, browser }) => {
	const owner = uniqueName('own');
	const slug = uniqueName('private');
	const ownerPage = await browser.newPage();
	await signIn(ownerPage, owner);
	await ownerPage.goto('/organizations/new');
	await ownerPage.getByLabel('Name').fill(slug);
	await ownerPage.getByRole('button', { name: 'Create organization' }).click();
	await expect(ownerPage).toHaveURL(`/o/${slug}/admin`);
	await ownerPage.close();

	await signIn(page, uniqueName('stranger'));
	const response = await page.goto(`/o/${slug}/admin`);
	expect(response?.status()).toBe(403);
	await expect(page.getByText("You aren't a member of this organization.")).toBeVisible();
});
