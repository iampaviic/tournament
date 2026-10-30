# Tournament Manager — Implementation Plan

## Context

FER "Programsko inženjerstvo" project. The team ran FERTRIS and found no flexible, open-source, API-friendly tournament platform, so they're building one inspired by Challonge. It has organizations, two-stage tournaments (SE/DE/RR/Swiss), pluggable OAuth identity modules (Discord, tetr.io…), bracket themes, match chat, and an org-scoped REST API.

**Decisions:** PostgreSQL + Drizzle. English UI, i18n-ready from the start (Paraglide). We write our own bracket engine.

## Stack

- Node 22, pnpm, SvelteKit 2 + Svelte 5 (runes), TypeScript (strict), SCSS (`sass-embedded`), `@sveltejs/adapter-node`
- Drizzle ORM + `postgres` driver, drizzle-kit migrations
- Zod v4 validates form actions and the REST API, and generates the OpenAPI spec (`zod-openapi`)
- A small in-house OAuth2 + PKCE client (no Arctic; it is deprecated on npm) and DB-backed sessions following the Lucia guide pattern
- Paraglide JS (`en` only for now)
- Vitest for unit/service tests, Playwright for e2e, ESLint + Prettier
- Deployment: Docker image run with Podman (compose: app + postgres), Apache as reverse proxy

## Architecture

```
src/
  lib/
    brackets/            # PURE engine, no DB/IO: single-elim, double-elim, round-robin, swiss, groups, standings
    server/
      db/                # schema.ts, index.ts, migrations
      auth/              # session.ts (tokens, cookies), guards (requireUser, requireTrusted, requireOrgRole)
      modules/           # AuthModule interface, registry, instance config; auth/{dev,discord,tetrio}
      services/          # organizations, tournaments, participants, matches, chat, apiKeys
      api/               # API-key auth, error envelope, zod schemas -> OpenAPI
      events.ts          # in-process pub/sub (match chat / match updates -> SSE)
    themes/              # bracket themes registry: default/, tetrio/
    components/, styles/
  routes/
    login, auth/[module]/{login,callback}, auth/logout
    dashboard, settings, settings/identities, u/[username]
    o/[org]/ (public)           o/[org]/admin/... (settings, members, api-keys, tournaments)
    t/[org]/[tournament]/       {home, bracket, matches, matches/[id], matches/[id]/events (SSE)}
    t/[org]/[tournament]/admin/ {general, auth, theme, structure, matches}
    api/v1/...                  # REST, Bearer API key
```

**Core rule:** UI form actions and the REST endpoints both call the same `services/*` functions. This keeps the proposal's promise that everything in the admin UI is also reachable over REST. The services take an actor (user session or API key) and do the authorization themselves.

### Auth modules (the extensibility point)

```ts
interface AuthModule<Cfg = unknown> {
	id: string;
	name: string;
	icon?: string;
	createAuthorizationURL(state, codeVerifier): URL;
	handleCallback(code, codeVerifier): Promise<ExternalIdentity>; // providerUserId, username, avatar, data
	refreshProfile?(identity): Promise<Record<string, unknown>>; // e.g. tetr.io rank/TR
	tournamentConfig?: ZodType<Cfg>; // organizer-editable options
	checkEligibility?(identity, cfg: Cfg): Promise<{ ok: boolean; reason?: string }>;
	bracketFields?(identity): Record<string, string>; // data themes can render
}
```

- Modules are installed at compile time in `modules/registry.ts`. The instance enables them via env: `AUTH_MODULES=discord,tetrio` and `TRUSTED_AUTH_MODULES=discord`, plus each module's secrets.
- A session row stores the `authModuleId` it was created with. Trust is checked **on every request** against current config, so the admin can revoke trust at any time. Untrusted sessions are refused in org/tournament admin routes (`requireTrusted`).
- **tetr.io has no OAuth.** The module runs the Discord OAuth flow, then calls `GET ch.tetr.io/api/users/search/discord:id:{id}` → `/users/:id` + `/summaries/league`. The user must have their Discord connection public on tetr.io. Respect the 5-min cache, keep to about 1 request per second, and send `X-Session-ID`. Its `tournamentConfig` has `minRank`/`maxRank` and a TR range.
- `dev` module: username-only login, enabled only when `NODE_ENV!=production`. Used for local work and Playwright.

### Bracket themes

`themes/registry.ts`. Each theme is a set of Svelte components (`ParticipantLabel`, `MatchCard`, optional `StageHeader`) and declares which `bracketFields` it reads (e.g. tetrio shows rank badge + TR). The instance admin chooses which themes are installed. The organizer picks one per tournament.

### Data model (Drizzle, Postgres)

- `users` (username, displayName, bio, avatar, showResults, showActivity, isInstanceAdmin) · `identities` (userId, moduleId, providerUserId, data jsonb, fetchedAt; unique(moduleId, providerUserId)) · `sessions` (id = sha256(token), userId, authModuleId, expiresAt)
- `organizations` (slug, name, description) · `org_members` (role: owner|admin) · `api_keys` (orgId, prefix, sha256 hash, name, createdBy, lastUsedAt; revoking deletes the row)
- `tournaments` (orgId, slug, name, description, startsAt, status: draft|registration|check_in|running|completed|cancelled, themeId, game jsonb, settings jsonb) · `tournament_auth_requirements` (moduleId, config jsonb)
- `participants` (tournamentId, userId, seed, checkedInAt, status, finalRank)
- `stages` (tournamentId, index 0|1, type, settings jsonb: groupCount, advancePerGroup, swissRounds, thirdPlace, grandFinalReset…, status) · `groups` · `rounds`
- `matches` (stageId, groupId, the engine template: templateId, side, round, position, slot sources; result: entrants, scores, winner; cached p1/p2 participantId and status for queries; helpRequested) · `match_reports` (by participant/organizer/api key, scores) · `match_messages` (matchId, authorId, body, createdAt)

### Bracket engine (`src/lib/brackets`, pure + exhaustively unit-tested) ✅

A stage is a list of **match templates**. Each slot is either a known entrant (`null` = bye) or the winner/loser of another match. The state of every match is **derived** from the templates plus the reported results, never stored by hand:

- `generateStage(type, seeds, options)` builds the templates. Swiss only builds round 1; `pairSwissRound(entrants, history, round)` pairs each later round from the results so far.
- `resolveStage(templates, results)` gives each match's entrants and status (`waiting`, `ready`, `completed`, `bye`, `skipped`). A result stores the entrants it was reported for, so correcting an earlier result makes later results stale (`staleResults`) instead of silently applying to new entrants.
- `computeStandings(entrants, matches, { scoring, tiebreakers })` for round robin and Swiss: points (default 1 / ½ / 0), head-to-head (restarted within each smaller tie), Buchholz, Sonneborn-Berger, game difference, games won, wins. Remaining ties share a rank and are ordered by seed.
- `eliminationStandings(entrants, matches)`: final places from each template's `placement` (final 1/2, semifinal losers 3, …; losers bracket rounds in double elimination).
- `snakeGroups(seeds, n)` and `seedAdvancers(groupRankings, perGroup)` for two-stage tournaments. Advancers are seeded so group mates meet as late as possible.

Formats:

- **SE:** pad to the next power of two, standard seed order (1v8, 4v5, 2v7, 3v6), byes for the top seeds, optional third place match.
- **DE:** losers of each winners round drop into the losers bracket in alternating reverse / reverse-half-shift order. This was chosen by simulating 8–256 entrants: no rematches before the losers final when favorites win (a rematch in the losers final can't be avoided). Grand final with optional reset (`GF2` is `skipped` if the winners bracket champion wins `GF1`).
- **RR:** circle method, optional double round robin.
- **Swiss:** Dutch-style pairing within score groups by backtracking search, no rematches unless unavoidable, the bye goes to the lowest-ranked entrant without one. Default rounds ⌈log₂ n⌉.

`simulate(templates, pick)` plays a stage to the end; tests use it for property checks (everyone but the champion loses exactly once/twice, everyone meets once in RR, …), and M4 can use it for demo data.

### Match flow + chat

Both players report. If the reports agree the match completes; if they conflict it becomes `disputed` and lands in the organizer queue. Players can raise a "Request organizer help" flag. Organizers and API keys can override the result. Chat messages are stored in `match_messages` and pushed live via SSE (`events.ts`; Postgres LISTEN/NOTIFY can replace this if we ever run more than one process).

### REST API (`/api/v1`, `Authorization: Bearer tm_<prefix>_<secret>`, scoped to the org)

Covers tournaments (CRUD, open/close registration, check-in, start/advance stage), participants (list/add/remove/seed), stages, matches (list/get/report/override), and match messages. The spec is served at `/api/v1/openapi.json` with a docs page. User and organization management stay out of the API, as the proposal says.

### Integrations

Steam game picker: search `IStoreService/GetAppList` with a server-side key and cache it in the DB, then store `{appId, name, header image}` on the tournament. It isn't an auth module.

## Milestones

| #         | Scope                                                                                                                                                | Done when                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **M0** ✅ | Scaffold, tooling, Docker/compose, CI, docs/PLAN.md                                                                                                  | `pnpm check/lint/test` green in CI, image builds                     |
| **M1** ✅ | Sessions, module interface/registry, dev + discord + tetrio modules, login/link identities, settings, basic profile                                  | Dev login e2e passes. Discord/tetrio callbacks pass with mocked HTTP |
| M2 ✅     | Organizations: create, public page (about/upcoming/archive), admin (settings, members, API keys), trust guard                                        | Untrusted session blocked from admin                                 |
| M3 ✅     | Bracket engine (pure lib)                                                                                                                            | Property and fixture tests for all 4 types + groups                  |
| M4        | Tournaments: create/config, structure editor (locked after start), auth requirements + eligibility, registration/check-in, start, result propagation | Full 2-stage tournament played via UI with dev users                 |
| M5        | Bracket view: pan/zoom canvas (EU Cannon style), themes (default + tetrio)                                                                           | All stage types render. Theme switch works                           |
| M6        | Matches page, match room, SSE chat, reporting/disputes, help flag, organizer match queue                                                             | Two browsers chat live and report                                    |
| M7        | REST API + OpenAPI + docs page                                                                                                                       | API e2e: create → start → report via key                             |
| M8        | Public profile with history/results + visibility, Steam game picker, polish/i18n audit                                                               |                                                                      |
| M9        | Deploy: Podman on VPS, Apache vhost (SSE: `flushpackets=on`, long timeout), backups, e2e suite in CI                                                 | Live on VPS                                                          |

## Implementation notes (M0 + M1)

- SvelteKit 3 specifics: `#lib/...` subpath imports need the file extension (`#lib/server/db/index.ts`). Env vars are declared in `src/env.ts` and read from `$app/env/private`. `redirect()` to another site needs `{ external: true }`.
- adapter-node 6 has no `ORIGIN`. Behind Apache, set `PROTOCOL_HEADER=x-forwarded-proto` (and `HOST_HEADER` unless `ProxyPreserveHost On`). OAuth redirect URIs are built from the request URL.
- The app builds without any env vars (`building` guards in `db/index.ts` and `modules/registry.ts`). A misconfigured auth module fails at startup.
- Tests: `*.spec.ts` are pure unit tests. `*.db.spec.ts` run against `TEST_DATABASE_URL`, whose schema is recreated. Playwright e2e runs the production build with the `dev` module (`ALLOW_DEV_AUTH=true`).

## M0 + M1 in detail

**M0**

1. `pnpm dlx sv create` (TS, minimal). Add-ons: eslint, prettier, vitest, playwright, drizzle (postgres), paraglide (en), sveltekit-adapter (node). Add `sass-embedded`.
2. `src/lib/styles/` holds SCSS tokens + base layout with a header (login state).
3. `Dockerfile` (multi-stage, node:22-alpine, runs migrations on start), `compose.yaml` (app + postgres:18), `.env.example`.
4. `.github/workflows/ci.yml` runs install, check, lint, unit tests with a postgres service, build, and docker build.
5. `README.md` (dev setup) and `docs/PLAN.md` (this roadmap).

**M1**

1. Schema: `users`, `identities`, `sessions`, plus the first migration.
2. `server/auth/session.ts`: random 20-byte token, id = sha256 hex, httpOnly cookie, 30-day sliding expiry. `hooks.server.ts` sets `locals.user/session/trusted`. Guards in `server/auth/guards.ts`.
3. `server/modules/{types,registry,config}.ts`: the env-driven enable and trusted lists, validated with zod at startup.
4. Modules: `dev`, `discord` (OAuth2 + PKCE, scope `identify`), `tetrio` (Discord flow + ch.tetr.io lookup, rank-range `tournamentConfig` + `checkEligibility`, `bracketFields`).
5. Routes: `/login` lists the enabled modules. `/auth/[module]/login` sets the state + PKCE cookie. `/auth/[module]/callback` either logs in, creates a user (unique username derived from the provider's), or links the identity to the current user. It rejects an identity already owned by someone else. `/auth/logout`.
6. `/settings` (display name, bio, visibility), `/settings/identities` (link/unlink, never the last one, refresh tetr.io data), `/dashboard` placeholder, `/u/[username]` basic.

## Verification

- `pnpm check`, `pnpm lint`, `pnpm test:unit`. Unit tests cover session tokens, config parsing, rank comparison and eligibility, and the discord/tetrio callbacks with mocked `fetch`.
- Start Postgres (docker or a local install), run `pnpm db:migrate`, then `pnpm test:e2e`. The Playwright test runs dev login → edit profile → visit `/u/[username]` → logout.
- `docker build .` succeeds. `compose up` serves the app and the login page renders.
- Real Discord login needs team-owned OAuth credentials, so the team checks it manually with `.env`.
