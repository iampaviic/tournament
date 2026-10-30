import { expect, test } from '@playwright/test';
import { seedSteamApps } from './db';
import { createApiKey, createOrganization, playerPage, signIn, uniqueName } from './helpers';

/** SvelteKit's CSRF check turns away POST and DELETE requests without a JSON content type. */
const auth = (key: string) => ({
	authorization: `Bearer ${key}`,
	'content-type': 'application/json'
});

type Match = {
	id: string;
	number: number;
	side: string;
	status: string;
	entrants: [string | null, string | null];
};

test('create → start → report via key', async ({ page, browser, request }) => {
	test.slow();
	await signIn(page, uniqueName('ao'));
	const orgSlug = await createOrganization(page, `Api ${uniqueName('a')}`);
	const key = await createApiKey(page, orgSlug, 'Discord bot');
	const otherSlug = await createOrganization(page, `Other ${uniqueName('b')}`);
	const otherKey = await createApiKey(page, otherSlug, 'Other bot');

	// The players only sign in once, so their users exist.
	const players = Array.from({ length: 4 }, (_, i) => uniqueName(`ap${i + 1}`));
	for (const player of players) await (await playerPage(browser, player)).context().close();

	const headers = auth(key);
	const created = await request.post('/api/v1/tournaments', {
		headers,
		data: { name: 'API Cup', slug: uniqueName('api-cup') }
	});
	expect(created.status()).toBe(201);
	const { id, slug } = await created.json();
	const path = `/t/${orgSlug}/${slug}`;
	const api = `/api/v1/tournaments/${id}`;

	// A single elimination cup with a match for third place.
	const structure = {
		stages: [
			{
				type: 'single_elimination',
				settings: {
					groupCount: 1,
					advancePerGroup: 2,
					thirdPlaceMatch: true,
					grandFinal: 'reset',
					doubleRoundRobin: false,
					swissRounds: null,
					scoring: { win: 1, draw: 0.5, loss: 0 }
				}
			}
		]
	};
	expect((await request.put(`${api}/stages`, { headers, data: structure })).status()).toBe(200);
	const stages = await (await request.get(`${api}/stages`, { headers })).json();
	expect(stages[0].settings.thirdPlaceMatch).toBe(true);

	const opened = await request.post(`${api}/open-registration`, { headers });
	expect((await opened.json()).status).toBe('registration');

	const ids: string[] = [];
	for (const username of players) {
		const added = await request.post(`${api}/participants`, { headers, data: { username } });
		expect(added.status()).toBe(201);
		ids.push((await added.json()).id);
	}
	const [p1, p2, p3, p4] = ids;
	const nobody = await request.post(`${api}/participants`, {
		headers,
		data: { username: uniqueName('nobody') }
	});
	expect(nobody.status()).toBe(422);
	expect((await nobody.json()).error.code).toBe('unprocessable');

	const seeded = await request.put(`${api}/participants/seeds`, {
		headers,
		data: { participantIds: ids }
	});
	const seeds = (await seeded.json()).map((p: { id: string; seed: number }) => [p.id, p.seed]);
	expect(Object.fromEntries(seeds)).toEqual(Object.fromEntries(ids.map((p, i) => [p, i + 1])));

	const started = await request.post(`${api}/start`, { headers });
	expect((await started.json()).status).toBe('running');
	const locked = await request.put(`${api}/stages`, { headers, data: structure });
	expect(locked.status()).toBe(409);
	expect((await locked.json()).error.code).toBe('conflict');

	const ready: Match[] = await (
		await request.get(`${api}/matches?status=ready`, { headers })
	).json();
	expect(ready).toHaveLength(2);
	const matches: Match[] = await (await request.get(`${api}/matches?stage=0`, { headers })).json();
	expect(matches).toHaveLength(4);
	const semi1 = matches.find((match) => match.number === 1)!;
	const semi2 = matches.find((match) => match.number === 2)!;
	expect(semi1.entrants).toEqual([p1, p4]);
	expect(semi2.entrants).toEqual([p2, p3]);
	const thirdPlace = matches.find((match) => match.side === 'third_place')!;
	const final = matches.find(
		(match) => match.side === 'main' && match.id !== semi1.id && match.id !== semi2.id
	)!;

	// An organizer result, then two agreeing reports on behalf of the players.
	const result = await request.put(`${api}/matches/${semi1.id}/result`, {
		headers,
		data: { scores: [2, 0] }
	});
	expect(await result.json()).toMatchObject({ status: 'completed', decidedBy: 'api_key' });
	const saved = await request.post(`${api}/matches/${semi2.id}/reports`, {
		headers,
		data: { participantId: p2, scores: [2, 1] }
	});
	expect((await saved.json()).outcome).toBe('saved');
	const agreed = await request.post(`${api}/matches/${semi2.id}/reports`, {
		headers,
		data: { participantId: p3, scores: [2, 1] }
	});
	expect(await agreed.json()).toMatchObject({
		outcome: 'agreed',
		match: { status: 'completed' }
	});

	const finalMatch = await (await request.get(`${api}/matches/${final.id}`, { headers })).json();
	expect(finalMatch).toMatchObject({ entrants: [p1, p2], status: 'ready' });
	const message = await request.post(`${api}/matches/${final.id}/messages`, {
		headers,
		data: { body: 'Final is up' }
	});
	expect(message.status()).toBe(201);
	expect(await message.json()).toMatchObject({
		apiKey: 'Discord bot',
		asOrganizer: true,
		author: null
	});

	for (const [match, scores] of [
		[final, [3, 1]],
		[thirdPlace, [2, 0]]
	] as const) {
		const set = await request.put(`${api}/matches/${match.id}/result`, {
			headers,
			data: { scores }
		});
		expect(set.status()).toBe(200);
	}
	expect((await (await request.get(api, { headers })).json()).status).toBe('completed');

	// Another organization's key doesn't find the tournament.
	const other = auth(otherKey);
	const hidden = await request.get(api, { headers: other });
	expect(hidden.status()).toBe(404);
	expect((await hidden.json()).error.code).toBe('not_found');
	const foreign = await request.put(`${api}/matches/${final.id}/result`, {
		headers: other,
		data: { scores: [0, 3] }
	});
	expect(foreign.status()).toBe(404);
	const otherList = await (await request.get('/api/v1/tournaments', { headers: other })).json();
	expect(otherList.map((t: { id: string }) => t.id)).not.toContain(id);

	// The pages show what the key did.
	await page.goto(`${path}/bracket`);
	await expect(page.locator('.placements li').first()).toContainText(players[0]);
	await page.goto(`${path}/matches`);
	await expect(page.getByTestId(`match-${final.id}`)).toContainText('Done');
	await expect(page.getByTestId(`match-${final.id}`)).toContainText('3–1');
	await page.goto(`${path}/matches/${final.id}`);
	const posted = page.getByRole('log').getByRole('listitem').filter({ hasText: 'Final is up' });
	await expect(posted).toContainText('Discord bot');
	await expect(posted.getByText('Organizer', { exact: true })).toBeVisible();
	await expect(posted.getByText('API key', { exact: true })).toBeVisible();
	await expect(page.getByText('This result was set through the API.')).toBeVisible();
});

test('set and clear the Steam game via key', async ({ page, request }) => {
	// A fresh cache, so the server doesn't ask Steam.
	await seedSteamApps([{ appId: 990001, name: 'E2E Tetris Arena' }]);
	await signIn(page, uniqueName('ag'));
	const orgSlug = await createOrganization(page, `Api ${uniqueName('g')}`);
	const headers = auth(await createApiKey(page, orgSlug, 'Game bot'));

	const created = await request.post('/api/v1/tournaments', {
		headers,
		data: { name: 'Game Cup', slug: uniqueName('game-cup') }
	});
	const { id, game } = await created.json();
	expect(game).toBeNull();
	const api = `/api/v1/tournaments/${id}`;

	const found = await request.get('/api/v1/steam/apps?q=E2E%20Tetris', { headers });
	expect(found.status()).toBe(200);
	expect((await found.json()).map((app: { appId: number }) => app.appId)).toContain(990001);
	expect((await request.get('/api/v1/steam/apps', { headers })).status()).toBe(400);

	const set = await request.patch(api, { headers, data: { game: { appId: 990001 } } });
	expect(set.status()).toBe(200);
	const picked = (await set.json()).game;
	expect(picked.name).toBe('E2E Tetris Arena');
	expect(picked.headerImage).toMatch(/\/990001\/header\.jpg$/);

	const unknown = await request.patch(api, { headers, data: { game: { appId: 1 } } });
	expect(unknown.status()).toBe(422);
	expect((await unknown.json()).error.code).toBe('unprocessable');
	expect((await (await request.get(api, { headers })).json()).game.appId).toBe(990001);

	const cleared = await request.patch(api, { headers, data: { game: null } });
	expect((await cleared.json()).game).toBeNull();
});

test('errors, spec and docs', async ({ page, request }) => {
	await signIn(page, uniqueName('ae'));
	const orgSlug = await createOrganization(page, `Api ${uniqueName('e')}`);
	const key = await createApiKey(page, orgSlug, 'Bot');
	const headers = auth(key);

	const missing = await request.get('/api/v1/tournaments');
	expect(missing.status()).toBe(401);
	expect((await missing.json()).error.code).toBe('unauthorized');
	expect(missing.headers()['www-authenticate']).toBe('Bearer');
	const unknown = await request.get('/api/v1/tournaments', {
		headers: auth(`tm_00000000_${'a'.repeat(43)}`)
	});
	expect(unknown.status()).toBe(401);

	const invalid = await request.post('/api/v1/tournaments', {
		headers,
		data: { name: '', slug: 'X' }
	});
	expect(invalid.status()).toBe(400);
	const { error } = await invalid.json();
	expect(error.code).toBe('invalid_request');
	expect(error.issues.map((issue: { path: string[] }) => issue.path)).toEqual(
		expect.arrayContaining([['name'], ['slug']])
	);

	const nope = await request.get('/api/v1/nope', { headers });
	expect(nope.status()).toBe(404);
	expect((await nope.json()).error.code).toBe('not_found');
	const method = await request.delete('/api/v1/tournaments', { headers });
	expect(method.status()).toBe(405);
	expect((await method.json()).error.code).toBe('method_not_allowed');

	const spec = await request.get('/api/v1/openapi.json');
	expect(spec.status()).toBe(200);
	const document = await spec.json();
	expect(document.openapi).toBe('3.1.0');
	expect(Object.keys(document.paths)).toEqual(
		expect.arrayContaining([
			'/tournaments',
			'/tournaments/{tournamentId}/stages',
			'/tournaments/{tournamentId}/matches/{matchId}/result',
			'/tournaments/{tournamentId}/matches/{matchId}/reports',
			'/tournaments/{tournamentId}/matches/{matchId}/messages'
		])
	);

	// A revoked key stops working.
	await page.goto(`/o/${orgSlug}/admin/api-keys`);
	await page.getByRole('button', { name: 'Revoke' }).click();
	await expect(page.getByText('No API keys yet.')).toBeVisible();
	expect((await request.get('/api/v1/tournaments', { headers })).status()).toBe(401);

	// The docs are linked from the API keys tab and the footer.
	await page.getByRole('main').getByRole('link', { name: 'Read the API documentation' }).click();
	await expect(page).toHaveURL('/docs/api');
	await expect(page.getByRole('heading', { level: 1, name: 'API documentation' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Authentication' })).toBeVisible();
	await expect(
		page.getByRole('heading', {
			name: 'PUT /api/v1/tournaments/{tournamentId}/matches/{matchId}/result'
		})
	).toBeVisible();
	await expect(
		page.getByRole('contentinfo').getByRole('link', { name: 'API documentation', exact: true })
	).toBeVisible();
});
