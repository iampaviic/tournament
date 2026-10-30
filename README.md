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

## Deployment

```bash
docker build -t tournament .
```

The image runs pending migrations and then starts the server on port 3000. `compose.yaml` runs the app and Postgres together, and also works with `podman compose`:

```bash
docker compose --profile app up --build
```

Behind a reverse proxy, set `PROTOCOL_HEADER=x-forwarded-proto` (and `HOST_HEADER=x-forwarded-host` unless the proxy preserves `Host`). The server uses these headers to build its own URLs, such as OAuth redirect URIs.
