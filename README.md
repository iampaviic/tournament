# Tournament Manager

An open-source tournament platform built for the FER _Programsko inženjerstvo_ course. It is inspired by [Challonge](https://challonge.com/) and grew out of running [FERTRIS](https://fertris.brownbird.eu/).

It covers organizations, two-stage tournaments (Swiss, round robin, single and double elimination), pluggable identity modules (Discord, TETR.IO, …), bracket themes, match chat, and a REST API for automation.

See [docs/PLAN.md](docs/PLAN.md) for the architecture and the roadmap.

## Stack

SvelteKit 3 (Svelte 5, TypeScript, SCSS), PostgreSQL with Drizzle ORM, Paraglide for i18n, Vitest and Playwright for tests. It is deployed as a Docker image (Podman) behind Apache.

## Development

You need Node 22.17+, pnpm 10 and PostgreSQL.

```bash
pnpm install
```

```bash
cp .env.example .env
```

Start Postgres with Docker or Podman (or point `DATABASE_URL` at your own server):

```bash
pnpm db:start
```

```bash
pnpm db:migrate
```

```bash
pnpm dev
```

With the default `.env`, the login page offers the **dev** module, which signs you in as any username. It only works in `pnpm dev`.

To try the app with data in it, add a demo club with sixteen players and a tournament in every state: two being played (with a disputed match, a help request and chat), one finished, one open for registration and a draft.

```bash
pnpm db:seed
```

Sign in with the dev module as `mara`, who runs the club, or as a player such as `kestrel`. `pnpm db:seed --reset` empties the whole database and adds the demo data again.

### Database changes

Edit `src/lib/server/db/schema.ts`, then generate a migration and commit it with the schema change:

```bash
pnpm db:generate --name describe_the_change
```

### Checks and tests

```bash
pnpm check
```

```bash
pnpm lint
```

Unit tests and database tests. The `db` tests recreate the schema of `TEST_DATABASE_URL`, which defaults to `postgres://root:mysecretpassword@localhost:5432/tournament_test`:

```bash
pnpm test:unit --run
```

End-to-end tests build the app and run it against `E2E_DATABASE_URL`, which defaults to the `tournament_e2e` database:

```bash
pnpm test:e2e
```

## Auth modules

The instance chooses its sign-in methods with environment variables:

| Variable                                     | Meaning                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `AUTH_MODULES`                               | Enabled modules, in login page order. Installed: `dev`, `discord`, `tetrio`.       |
| `TRUSTED_AUTH_MODULES`                       | Modules considered secure. A session from any other module can't open admin pages. |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Discord OAuth2 app, used by `discord` and `tetrio`.                                |

In the Discord developer portal, register `<origin>/auth/discord/callback` and `<origin>/auth/tetrio/callback` as redirect URIs.

TETR.IO has no OAuth. The `tetrio` module signs the user in with Discord and finds the TETR.IO account that has that Discord account connected, so the connection must be public in the user's TETR.IO settings.

To add a module, implement `AuthModule` from `src/lib/server/modules/types.ts` and register it in `src/lib/server/modules/registry.ts`.

## Bracket themes

Organizers pick a theme for each tournament's bracket in its admin Theme tab. Installed: `default` (the site's colors, light or dark) and `tetrio` (shows TETR.IO rank, TR and country from linked accounts). Set `BRACKET_THEMES=default,tetrio` to limit which ones can be picked; all are available when it's empty.

To add a theme, implement `BracketTheme` from `src/lib/themes/types.ts` (colors plus a `ParticipantLabel` component) and register it in `src/lib/themes/index.ts`.

## Profiles

Every user has a public profile at `/u/[username]`. Its results list the tournaments they play or played, with their final rank and match record (won–drawn–lost); its activity lists the tournaments they're registered for that haven't started, and the organizations they belong to. Users can hide either in Settings; they always see their own profile in full, with a note on what others don't see.

## Steam games

Organizers can set the Steam game a tournament is played in, on its admin General tab. It shows with its artwork on the tournament page and in tournament lists. The picker needs a Steam Web API key (https://steamcommunity.com/dev/apikey) in `STEAM_API_KEY`; without one it's hidden, and games picked earlier still show.

The instance keeps Steam's list of games in its database (`steam_apps`). It is fetched on the first search and refreshed in the background when a search finds it older than a day; if Steam fails, the old list keeps working and the next attempt waits 10 minutes. Over the REST API, `GET /api/v1/steam/apps?q=` searches it, and `PATCH /api/v1/tournaments/{id}` sets `game: { "appId": … }` (or `null`).

## REST API

Organizations can run their tournaments over a REST API at `/api/v1`, e.g. from a Discord bot. Create a key in the organization admin on the **API keys** tab (it's shown only once) and send it with every request:

```bash
curl -H "Authorization: Bearer tm_…" http://localhost:5173/api/v1/tournaments
```

A key only sees its own organization's tournaments. Request and response bodies are JSON; send `Content-Type: application/json` on every POST, PUT, PATCH and DELETE, also without a body, or SvelteKit's CSRF check turns it away. The OpenAPI 3.1 document is at `/api/v1/openapi.json`, and `/docs/api` shows it as a reference.

## Translations

Every UI string, including error messages, is in `messages/en.json` and goes through [Paraglide](https://inlang.com/m/gerre34r/library-inlang-paraglideJs). To add a language, copy that file to `messages/<locale>.json` (e.g. `messages/de.json`), translate the values, and add the locale to `locales` in `project.inlang/settings.json`. Browsers that prefer it get it (a `PARAGLIDE_LOCALE` cookie overrides that), dates and numbers follow through `src/lib/format.ts`, and so does `<html lang>`. The REST API answers in English.

## Deployment

```bash
docker build -t tournament .
```

The image runs pending migrations and then starts the server on port 3000. `compose.yaml` runs the app and Postgres together, and also works with `podman compose`:

```bash
docker compose --profile app up --build
```

Behind a reverse proxy, set `PROTOCOL_HEADER=x-forwarded-proto` (and `HOST_HEADER=x-forwarded-host` unless the proxy preserves `Host`). The server uses these headers to build its own URLs, such as OAuth redirect URIs.
