# Profiles with results, the Steam game picker, M6/M7 follow-ups, i18n and accessibility (M8)

The uncommitted M8 change (88 modified files, 21 new ones, nothing staged) covers the whole brief: gated public profiles, a daily-cached Steam game picker, the REST `game` field and `GET /api/v1/steam/apps`, the six M6 and four non-CSRF M7 findings, the i18n sweep with its guard test, the accessibility checklist and the docs. The design choices are the plan's. The visibility filter sits in the service. The cache is refreshed under a DB claim with a swap in one transaction. The image URL is derived server-side. I re-ran check (0 errors / 0 warnings), lint, test:unit (37 files / 436 tests) and the full e2e suite (16 passed, no Steam refresh attempted).

Watch for: `routes.db.spec.ts` drives routes that use the global `steamApps` singleton and only passes when the environment has no `STEAM_API_KEY`. With the key in `.env`, which the new docs tell developers to set, `test:unit` downloads Steam's app list with the real key and then fails (confirmed, reproduced with a dummy key and outbound traffic blocked). Smaller gaps: the "picker hidden without a key" path and the new `handleError` translations have no test (confirmed). Outside M8: the db tests run against `.env`'s `local` database, not `tournament_test`, so every `test:unit` run truncates it (confirmed, pre-existing).

**Verdict**: NEEDS_CHANGES

## High-level view

Profiles are UI-only. `getProfile` returns `null` for a hidden section unless the viewer is the owner, so hidden data never reaches page data. Records count only `completed` matches. Organizations are gated by `showActivity`, with the settings label updated to say so.

The Steam cache claims its `steam_app_list` row (`ON CONFLICT DO UPDATE … WHERE attempted_at < now − 10 min`) before fetching. That claim is the cross-process lock and the back-off after a failure. A refresh swaps the list in one transaction, so a failed one changes only `attempted_at`, and the key never reaches a log. It fails open: if Steam keeps failing, searches answer from the stale list indefinitely while a background attempt fails and logs every 10 minutes. Each search during a held claim still runs the no-op claim upsert (likely cheap at this scale).

The picker works as a GET search form with "Pick" buttons, and with JS as an ARIA 1.2 combobox over the admin-only `admin/games` endpoint. Both paths have e2e coverage on a seeded cache with the CDN aborted. `headerImage` is always built from the app id on the server, so no client can inject an image URL. PATCH resolves the game before writing, so a 422 changes nothing. The no-key path (`steam: null` in the General tab load, so no picker, while a stored game still shows) has no test (confirmed): the e2e server always has a key, and no db spec loads that page.

Isolation from Steam is weaker than the plan assumes. The service tests inject their own instances. `routes.db.spec.ts` exercises the real routes, whose `steamApps` is built from `$app/env/private`, and in Vitest that module is filled from `.env` and the shell, not from the project's `test.env`.

The M6/M7 follow-ups, the i18n sweep (messages created per request, lazy Zod errors, `configFields()` as a method, English unchanged) and the accessibility checklist all land as the plan describes. The one new untested behaviour among them is `handleError`, which changes the text every unknown URL shows. CSRF is untouched and nothing was committed.

<details>
<summary>Issues (4)</summary>

1. **Route specs depend on an unset `STEAM_API_KEY`** — `routes.db.spec.ts` reaches api.steampowered.com and fails once the key is in `.env` or the shell. In that spec, replace the `steamApps` singleton with a disabled instance through `vi.mock`, and add a db-project setup file that stubs `globalThis.fetch` to reject.
2. **Picker-hidden path untested** — nothing checks that the General tab has no picker without a key. Add a db spec calling the admin `load` (as `matches.db.spec.ts` does for the room) that asserts `steam: null` and that `game` passes through, using the same disabled-instance mock.
3. **`handleError` untested** — no test covers the translated framework 404 ("Page not found") or the unknown-error branch. Add an e2e `goto('/no-such-page')` assertion or a unit test per `kind`.
4. **db tests truncate the `local` database (pre-existing)** — `$app/env/private` in Vitest is inlined from `.env`, so `DATABASE_URL` is `local`, not `tournament_test`. Fixing it (e.g. a `.env.test` with the test URL and an empty `STEAM_API_KEY`, which Vite loads in test mode) changes the test setup and needs the user's go-ahead.

</details>

<details>
<summary>Details</summary>

### Route tests that rely on an unset `STEAM_API_KEY`

`services/steam.ts` exports `steamApps = createSteamApps({ apiKey: STEAM_API_KEY })`, used by the REST route, the admin endpoint, the General tab load and the `resolveGame`/`setGame` defaults. `routes.db.spec.ts` imports the real route modules and asserts behaviour that only holds when that singleton is disabled:

```ts
// The same game is kept without a lookup; db tests have no Steam API key.
const other = await call(tournamentRoute.PATCH, { body: { name: 'Renamed', game: { appId: 20 } } });
expect(other.status).toBe(422);
…
const response = await call(steamAppsRoute.GET, { query: { q: 'x' } });
expect(await response.json()).toEqual([]);
```

In Vitest, `$app/env/private` comes from SvelteKit's generated dev env module (`.svelte-kit/generated/dev/env/config.js`). That module inlines `vite.loadEnv(mode, root, '')`: `.env`, `.env.local`, `.env.test` and the shell, but not the db project's `test.env`. Once a developer adds `STEAM_API_KEY` to `.env`, as `.env.example` and the README's "Steam games" section invite, both tests trigger a real refresh. `resetDatabase()` left the cache never-fetched, so `ensureFresh` awaits a full `GetAppList` download with the developer's real key. After that, `'x'` matches real games and app 20 exists, so both assertions fail. (confirmed)

I reproduced this without reaching Steam. With `STEAM_API_KEY=review-dummy` in the shell and `NODE_USE_ENV_PROXY`/`HTTPS_PROXY` pointing at a closed port, `vitest --project db routes.db.spec.ts -t "finds nothing without"` left a `steam_app_list` claim row with `attempted_at` at the run time and `fetched_at` null: the refresh had started, and only the blocked network stopped it. Without the variable, no row is written. The generated env module showed the dummy key inlined, and a normal run afterwards regenerated it without the key.

This breaks the brief's "no test can reach Steam" for a configuration the change itself documents. Mocking the singleton in that spec (`vi.mock('#lib/server/services/steam.ts', async (original) => ({ ...(await original()), steamApps: createSteamApps({ apiKey: undefined }) }))`; `live.spec.ts` already mocks `$app/navigation` this way) fixes these assertions. A db-project setup file that makes `globalThis.fetch` reject guarantees no db test opens a connection, whatever the environment.

### Repository state and verification

HEAD is `a7988f9` ("Ignore files the inlang SDK generates in Prettier"), not `b107ddc`. It's the user's own commit, pushed to `origin/milestones/m6-m8` at 18:33, before the M8 task was created (18:44), and it only touches `.prettierignore`. M8 committed and staged nothing, but the final commit step should expect `a7988f9` as its parent. The CSRF setup is unchanged: `vite.config.ts` only gained the Paraglide `strategy`, the `sveltekit({...})` options have no `csrf` key, and `hooks.server.ts` only gained `handleError`, with no origin check.

The FEAT evidence matches my runs: check 0/0, lint clean, test:unit 37 / 436, full e2e 16 passed. The e2e server sets `STEAM_API_KEY: 'e2e-dummy-key'` explicitly, every test that searches seeds a fresh cache first, and the run logged no "Couldn't refresh the Steam app list".

The pre-existing database issue: `db/index.ts` reads `DATABASE_URL` from `$app/env/private`, which in Vitest is the `.env` value (`…/local`), while `db-setup.ts` migrates `project.config.env.DATABASE_URL` (`tournament_test`). After a normal `vitest --project db routes.db.spec.ts`, `local` held the rows that spec's last test created, timestamped at the run, and `tournament_test` was empty (confirmed). Every `test:unit` run therefore truncates the developer's `local` database, and with M8 that includes any local Steam cache, which forces an awaited re-download on the next dev search. The wiring is unchanged from HEAD.

</details>

<details>
<summary>File map</summary>

Full diff: `git -C c:\Users\patrik.pavic\Desktop\tournament2\tournament diff HEAD` plus the untracked files below.

- Steam: `src/lib/server/services/steam.ts` (new, cache + fetch), `steam.db.spec.ts` (new), `src/routes/api/v1/steam/apps/+server.ts` (new REST search), `src/routes/t/[org]/[tournament]/admin/games/+server.ts` (new admin search), `src/lib/components/GamePicker.svelte`, `SteamGame.svelte` (new), `src/env.ts`, `.env.example`, `compose.yaml` (`STEAM_API_KEY`)
- Schema: `src/lib/server/db/schema.ts` (`tournaments.game`, `steam_apps`, `steam_app_list`), `drizzle/0005_steam_games.sql`, `drizzle/meta/0005_snapshot.json`, `_journal.json`, `src/lib/tournaments.ts` (`Game`), `src/lib/server/testing/factories.ts` (truncate, `seedSteamApps`)
- Tournaments and API: `services/tournaments.ts` (`resolveGame`, `setGame`, list fields, i18n), `api/schemas.ts`, `endpoints.ts`, `openapi.ts`, `responses.ts` (`game`, `searchSteamApps`, `requireApiMatch`, no `bye`), `routes/api/v1/tournaments/[tournamentId]/+server.ts` (PATCH game), match `messages`/`result`/`reports`/`help` routes (404 before writes), `openapi.db.spec.ts` (30), `api/routes.db.spec.ts` (new)
- Profiles: `services/profiles.ts`, `profiles.db.spec.ts` (new), `routes/u/[username]/+page.server.ts`, `+page.svelte`, `src/lib/format.ts` (`formatRecord`, `formatDateTime`, `formatNumber`), `format.spec.ts` (new)
- Display: `routes/t/[org]/[tournament]/+layout.server.ts`, `+layout.svelte` (game, `formatDateTime`, titles), `admin/+page.server.ts`, `admin/+page.svelte` (Game card, field a11y), `TournamentList.svelte`
- M6 follow-ups: `src/lib/chat.ts`, `chat.spec.ts`, `live.ts`, `live.spec.ts`, `LiveStatus.svelte` (new), match room and matches list pages, room `+page.server.ts`, `matches.db.spec.ts`, `e2e/matches.e2e.ts`
- i18n: `messages/en.json`, every service, `auth/{guards,org,tournament,username}.ts`, `modules/{types,oauth2}.ts`, `modules/auth/{dev,discord,tetrio}.ts`, themes, `services/requirements.ts` (+ `{}` for option-less modules), auth/org/settings/admin route loads and actions, `hooks.server.ts` (`handleError`), `vite.config.ts` and `package.json` (Paraglide strategy), `src/lib/messages.spec.ts` (new guard)
- Accessibility: `routes/+layout.svelte`, `settings/+layout.svelte`, `global.scss`, `_tokens.scss`, `contrast.spec.ts` (new), field markup in settings, org and tournament admin pages, `DateTimeInput.svelte`, `StageFields.svelte`, `OrganizationFields.svelte`, admin layouts (titles), bracket and admin matches (heading levels), `e2e/auth.e2e.ts`
- e2e: `e2e/db.ts` (new), `steam.e2e.ts`, `profiles.e2e.ts` (new), `api.e2e.ts`, `playwright.config.ts`
- Docs: `docs/PLAN.md` (M8 ✅, notes, data model), `README.md` (Profiles, Steam games, Translations)

</details>
