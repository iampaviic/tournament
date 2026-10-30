# M7 plan: REST API (`/api/v1`, Bearer API key), OpenAPI spec, API docs page

Repo: `c:\Users\patrik.pavic\Desktop\tournament2\tournament`, branch `claude/cool-archimedes-iqm428`, HEAD `07ff966` (M6). Work in this checkout. Do not commit until the final step, then make exactly one commit. Never stage `.agents/` or `.env`. Never push.

## Environment (verified during planning)

- pnpm: `corepack pnpm <cmd>`. Playwright's webServer runs `pnpm build`, so every e2e command needs the user-level shims on PATH in the same shell call: `$env:PATH = "$env:LOCALAPPDATA\corepack-shims;$env:PATH"; corepack pnpm test:e2e` (the shims exist).
- Postgres: container `tournament-db-1` is up and healthy. Databases `local`, `tournament_test`, `tournament_e2e` exist. `.env` has `DATABASE_URL`, `AUTH_MODULES` and `TRUSTED_AUTH_MODULES`. If drizzle-kit says DATABASE_URL is not set, prefix with `$env:DATABASE_URL='postgres://root:mysecretpassword@localhost:5432/local';`.
- Baseline today: `corepack pnpm check` gives 0 errors and 0 warnings. `corepack pnpm test:unit --run` passes 24 files and 289 tests (server and db projects). The M6 commit records `test:e2e` as 9 passed. `git status` is clean except `.agents/`.
- The vitest `server` project has no `DATABASE_URL` in CI, and `#lib/server/db/index.ts` throws at import without it. So any test that imports a service, `api/schemas.ts`, `api/endpoints.ts` or a route module must be a `*.db.spec.ts`. Only pure modules (`api/errors.ts`, `api/openapi.ts`, `api/reference.ts`, `services/requirements.ts`) get plain `*.spec.ts` tests.
- Vitest has `expect.requireAssertions: true`, so every test must assert.
- Prettier also checks `.agents/**`. Run `corepack pnpm format` before `corepack pnpm lint`.

## Design decisions

1. **Routes are thin wrappers around endpoint definitions.** `src/lib/server/api/endpoints.ts` declares each operation once with `defineEndpoint({ operationId, method, path, tag, summary, description?, params?, query?, body?, response, conflicts? })`. The Zod schemas live in `api/schemas.ts`. Each `src/routes/api/v1/**/+server.ts` exports `GET/POST/… = endpoint(api.<operationId>, run)` and `fallback = methodNotAllowed`. The `endpoint()` wrapper (`api/handler.ts`) does auth, validates params, query and body with the definition's own schemas, runs the handler and maps errors. The OpenAPI document is built from the same `endpoints` array, so the spec and the validation can't drift. A db test checks every route file against the list.
2. **OpenAPI comes from Zod 4's built-in `z.toJSONSchema`, without `zod-openapi`.** OpenAPI 3.1 uses JSON Schema 2020-12, which is `z.toJSONSchema`'s default target. Named schemas are registered in one `z.registry<{ id: string }>()` (`components`, defined in `api/schemas.ts` so dev HMR re-creates it with the module). `z.toJSONSchema(components, { io: 'input', uri })` emits `components.schemas` with `#/components/schemas/<id>` refs. A ~150-line builder (`api/openapi.ts`) adds paths, parameters, the error responses and the bearer scheme. There is no new dependency (verified: refs, `.describe()` descriptions, tuples as `prefixItems`, nullable as `anyOf`, and transforms all work in input mode). PLAN.md's Stack line and the M7 notes record this choice.
3. **API key guard** `src/lib/server/auth/apiKey.ts`, next to the other guards. `requireApiKey(event)` parses `Authorization: Bearer <key>` and calls `verifyApiKey`, which already looks keys up by prefix and compares the sha256 hash with `timingSafeEqual`. It now also returns `name` and writes `lastUsedAt` at most once per 60 s per key, with a `now` parameter for tests. A missing or malformed header, a bad key or a revoked key throws `error(401, …)`. `requireApiTournament(key, tournamentId)` loads by id and throws `error(404, 'Tournament not found.')` when the tournament is missing or belongs to another organization. There is no CORS and no rate limiting; rate limiting is an open item in the notes.
4. **Error envelope** `{ "error": { "code", "message", "issues"? } }` comes from `api/errors.ts` `errorResponse(e)`:
   - `ZodError` from the query or body → 400 `invalid_request`, with `issues: [{ path, message }]`.
   - A path param that fails its schema → 404 `not_found` (the resource can't exist).
   - Malformed JSON → 400.
   - `HttpError` from the guards → its status (401 `unauthorized` with a `WWW-Authenticate: Bearer` header, 404 `not_found`).
   - `ServiceError` by its new `kind`: `conflict` (the default: the phase or state forbids it) → 409, `invalid` (the input breaks a rule) → 422, `not_found` → 404.
   - Anything else → `console.error` and a 500 `internal_error`.
   - Unknown `/api/v1/*` routes answer 404 through a `[...path]` catch-all. A wrong method on a known route answers 405 `method_not_allowed` through `fallback` exports.
5. **`ServiceError` gets a `kind`** (`'conflict' | 'invalid' | 'not_found'`, default `'conflict'`). Only these throws change: `'Match not found.'` (matches.ts ×2, chat.ts) and the new `'Participant not found.'` → `not_found`; `resultFor`'s two score rules, `'Only the players of this match can report its result.'`, addParticipant's `There is no user called …`, setStructure's parse error, setTheme's `'That theme is not available.'` and the new setSeeds order check → `invalid`. Every other throw stays a conflict. The UI routes still catch `ServiceError` and show `e.message`, so the UI doesn't change.
6. **The URLs use ids, not slugs:** `/tournaments/{tournamentId}`, `/participants/{participantId}`, `/matches/{matchId}`, all uuids. Ids stay stable when an organizer renames a slug. Responses include `slug`.
7. **Lifecycle uses action endpoints that mirror the admin lifecycle panel and call the existing services:** `open-registration` (publish a draft, or reopen during check-in), `open-check-in` (closes sign-ups), `unpublish` (back to draft), `start`, `start-next-stage`. The transitions are `setStatus`'s `TRANSITIONS`, `startTournament` and `startNextStage`.
8. **Deleting only works for drafts, enforced in the service.** The admin page lets an organizer delete any tournament after typing its address. The API has no such confirmation, so it uses a new `deleteDraftTournament(tournament)`, which throws a conflict unless the status is `draft`. The UI keeps `deleteTournament`.
9. **Reports on behalf of a player use the same state machine.** `services/matches.ts` gets a private `report(tournament, matchId, by: Reporter, scores)` with `Reporter = { userId } | { participantId; apiKeyId }`. `reportResult` keeps its signature and wraps it, and the new `reportForParticipant(tournament, matchId, { participantId, apiKeyId }, scores)` also wraps it. The stored row is `source: 'participant'`, the participant's id, `userId: null` and the key's `apiKeyId`. `PUT …/result` calls the existing `setMatchResult(…, { apiKeyId })`, which stores an `api_key` report and clears the reports, the dispute and the help flag.
10. **Messages from API keys.** `match_messages.author_id` becomes nullable, and a new nullable `api_key_name text` stores the key's name when the message is posted. The name is copied because revoking a key deletes its row, so a foreign key would lose the label or the messages. `postMessage(tournament, matchId, author: { userId; organizer } | { apiKeyName }, body)` stores key messages with `asOrganizer: true` and publishes them to the room's SSE as before. `ChatMessage.author` becomes nullable and gains `apiKey: string | null`. `MatchChat.svelte` shows the key's name with the "Organizer" and "API key" badges. The room says "This result was set through the API." when `decidedBy === 'api_key'`.
11. **Requirements and theme are also exposed, so every admin action has a REST equivalent.** The config check moves out of `readModuleConfig` into a pure `parseModuleConfig(module, raw)`, and a pure `parseRequirements(input, modules)` rejects disabled or unknown modules, duplicates and invalid options. The API handler throws `ServiceError(…, 'invalid')` on failure and then calls `setRequirements`.
12. **Seeds:** a new `setSeeds(tournament, order)` service checks that the order lists every participant exactly once (`invalid`) and that the tournament hasn't started (`conflict`), then calls the existing `writeSeeds`. Shuffle maps to `shuffleSeeds`.
13. **Docs page at `/docs/api`** (`src/routes/docs/api/`). It is a page about the API, so it stays out of the JSON `/api` namespace. The server load turns the generated document into a view model with the pure `api/reference.ts`: tags with their operations, fields as name, type, required and description, and type labels linking to `#schema-<Name>`. The Svelte page renders it with landmarks, headings, tables and `<pre><code>`, in light and dark mode through the tokens. Every UI string comes from Paraglide. Summaries and descriptions are API content in English, from the endpoint definitions. The docs page is linked from a new site footer and from the org admin API keys tab.
14. **Response bodies are typed with `z.input<typeof <schema>>`.** Serializers in `api/responses.ts` convert Dates to ISO strings, so the compiler keeps responses in line with the documented schemas. Lists are plain JSON arrays. A match's `status` in the API is the `MatchProgress` value players see: waiting, ready, reported, disputed, completed or skipped.

## Endpoints (base `/api/v1`, all with Bearer auth)

`t` = the tournament from `requireApiTournament(key, params.tournamentId)`. Every row except `listTournaments` and `createTournament` loads `t` first.

| operationId         | Method | Path                                                              | Body / query                                      | Service call                                                                    | Success                   | Conflicts |
| ------------------- | ------ | ----------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------- | --------- |
| listTournaments     | GET    | /tournaments                                                      | –                                                 | `listOrgTournaments(key.orgId, { includeDrafts: true })`                        | 200 `TournamentSummary[]` | –         |
| createTournament    | POST   | /tournaments                                                      | `TournamentCreate` {name, slug}                   | `createTournament(key.orgId, body)`                                             | 201 `Tournament`          | 409       |
| getTournament       | GET    | /tournaments/{tournamentId}                                       | –                                                 | –                                                                               | 200 `Tournament`          | –         |
| updateTournament    | PATCH  | /tournaments/{tournamentId}                                       | `TournamentUpdate` (partial)                      | `updateTournament(t, { ...current(t), ...body })`                               | 200 `Tournament`          | 409       |
| deleteTournament    | DELETE | /tournaments/{tournamentId}                                       | –                                                 | `deleteDraftTournament(t)`                                                      | 204                       | 409       |
| setTheme            | PUT    | /tournaments/{tournamentId}/theme                                 | `ThemeUpdate` {themeId}                           | `setTheme(t, body.themeId)`                                                     | 200 `Tournament`          | 422       |
| getRequirements     | GET    | /tournaments/{tournamentId}/requirements                          | –                                                 | `getRequirements(t.id)`                                                         | 200 `Requirement[]`       | –         |
| setRequirements     | PUT    | /tournaments/{tournamentId}/requirements                          | `RequirementsUpdate` {requirements}               | `parseRequirements(body.requirements, listModules())` then `setRequirements`    | 200 `Requirement[]`       | 409, 422  |
| openRegistration    | POST   | /tournaments/{tournamentId}/open-registration                     | –                                                 | `setStatus(t, 'registration')`                                                  | 200 `Tournament`          | 409       |
| openCheckIn         | POST   | /tournaments/{tournamentId}/open-check-in                         | –                                                 | `setStatus(t, 'check_in')`                                                      | 200 `Tournament`          | 409       |
| unpublishTournament | POST   | /tournaments/{tournamentId}/unpublish                             | –                                                 | `setStatus(t, 'draft')`                                                         | 200 `Tournament`          | 409       |
| startTournament     | POST   | /tournaments/{tournamentId}/start                                 | –                                                 | `startTournament(t)`                                                            | 200 `Tournament`          | 409       |
| startNextStage      | POST   | /tournaments/{tournamentId}/start-next-stage                      | –                                                 | `startNextStage(t)`                                                             | 200 `Tournament`          | 409       |
| listStages          | GET    | /tournaments/{tournamentId}/stages                                | –                                                 | `getBracket(t.id)`                                                              | 200 `Stage[]`             | –         |
| setStages           | PUT    | /tournaments/{tournamentId}/stages                                | `StructureUpdate` {stages: structureSchema}       | `setStructure(t, body.stages)`                                                  | 200 `Stage[]`             | 409       |
| listParticipants    | GET    | /tournaments/{tournamentId}/participants                          | –                                                 | `listParticipants` + `checkRequirements`                                        | 200 `Participant[]`       | –         |
| addParticipant      | POST   | /tournaments/{tournamentId}/participants                          | `ParticipantAdd` {username}                       | `addParticipant(t, body.username)` (no requirement or limit check, like the UI) | 201 `Participant`         | 409, 422  |
| setSeeds            | PUT    | /tournaments/{tournamentId}/participants/seeds                    | `SeedOrder` {participantIds}                      | `setSeeds(t, body.participantIds)`                                              | 200 `Participant[]`       | 409, 422  |
| shuffleSeeds        | POST   | /tournaments/{tournamentId}/participants/shuffle                  | –                                                 | `shuffleSeeds(t)`                                                               | 200 `Participant[]`       | 409       |
| removeParticipant   | DELETE | /tournaments/{tournamentId}/participants/{participantId}          | –                                                 | `removeParticipant(t, id)`                                                      | 204                       | 409       |
| setCheckIn          | PUT    | /tournaments/{tournamentId}/participants/{participantId}/check-in | `CheckInUpdate` {checkedIn}                       | `setCheckedIn(t, id, body.checkedIn)`                                           | 200 `Participant`         | 409       |
| listMatches         | GET    | /tournaments/{tournamentId}/matches                               | query `stage?` (index), `status?` (MatchProgress) | `listMatches(await getBracket(t.id))`, filtered                                 | 200 `Match[]`             | –         |
| getMatch            | GET    | /tournaments/{tournamentId}/matches/{matchId}                     | –                                                 | `getMatch(t.id, id)` (404 if undefined)                                         | 200 `MatchDetail`         | –         |
| setMatchResult      | PUT    | /tournaments/{tournamentId}/matches/{matchId}/result              | `ResultUpdate` {scores}                           | `setMatchResult(t, id, scores, { apiKeyId: key.id })`                           | 200 `MatchDetail`         | 409, 422  |
| clearMatchResult    | DELETE | /tournaments/{tournamentId}/matches/{matchId}/result              | –                                                 | `clearMatchResult(t, id)`                                                       | 200 `MatchDetail`         | 409       |
| reportMatch         | POST   | /tournaments/{tournamentId}/matches/{matchId}/reports             | `ReportCreate` {participantId, scores}            | `reportForParticipant(t, id, { participantId, apiKeyId: key.id }, scores)`      | 200 `ReportOutcome`       | 409, 422  |
| clearHelp           | DELETE | /tournaments/{tournamentId}/matches/{matchId}/help                | –                                                 | `clearHelp(t, id)`                                                              | 200 `MatchDetail`         | –         |
| listMessages        | GET    | /tournaments/{tournamentId}/matches/{matchId}/messages            | –                                                 | `getMatch` (404) then `listMessages(id)`                                        | 200 `Message[]`           | –         |
| postMessage         | POST   | /tournaments/{tournamentId}/matches/{matchId}/messages            | `MessageCreate` {body: messageSchema}             | `postMessage(t, id, { apiKeyName: key.name }, body.body)`                       | 201 `Message`             | –         |

Unauthenticated: `GET /api/v1/openapi.json` (the document, not listed in its own `paths`). The `[...path]` fallback returns a 404 envelope.

Tags (in this order): Tournaments, Lifecycle, Stages, Participants, Matches, Messages. Requirements and theme belong to Tournaments. Results, reports and help belong to Matches.

## Items

Items 1–6 are FEAT-001 (services, schema, guard, chat label). Items 7–12 are FEAT-002 (REST API and spec). Items 13–17 are FEAT-003 (docs page, e2e, docs). The final workflow step makes the single commit.

- [ ] 1. Give `ServiceError` a `kind` and classify the throws listed in decision 5. Use an explicit field, not a constructor parameter property: `readonly kind: ServiceErrorKind; constructor(message: string, kind: ServiceErrorKind = 'conflict') { super(message); this.kind = kind; }`, with `export type ServiceErrorKind = 'conflict' | 'invalid' | 'not_found'` and a doc comment saying the REST API maps it to 409/422/404.
      Files: src/lib/server/services/errors.ts, matches.ts, chat.ts, participants.ts, tournaments.ts
      Verify: `corepack pnpm check` has 0 errors, and `corepack pnpm test:unit --run` still passes 289 tests.

- [ ] 2. Service additions for the API, each with a terse doc comment:
  - participants.ts:
    - `getParticipantById(tournamentId, participantId)`.
    - `addParticipant` returns the new participant's id (`.returning({ id: participants.id })`).
    - `removeParticipant` and `setCheckedIn` use `.returning({ id: participants.id })` and throw `ServiceError('Participant not found.', 'not_found')` when nothing matched.
    - New `setSeeds(tournament, order)`: `assertNotStarted`, then in a transaction compare `order` with `listParticipants(tournament.id, tx)` ids (same length, no duplicates, all known, else `ServiceError('List every participant exactly once.', 'invalid')`), then `writeSeeds(tx, tournament.id, order)`.
  - tournaments.ts: `deleteDraftTournament(tournament)` throws `ServiceError('Only draft tournaments can be deleted here. Delete published ones from the admin page.')` unless the status is `draft`, then calls `deleteTournament(tournament.id)`.
  - requirements.ts:
    - Extract `parseModuleConfig(module, raw)` from the tail of `readModuleConfig`, which then calls it. Same result type.
    - Add `parseRequirements(input: Requirement[], modules: AuthModule[])` returning `{ ok: true; requirements } | { ok: false; error }`. Errors: `There is no auth module called "<id>".` and `<Module name> is required twice.`; config errors come from `parseModuleConfig`.
  - matches.ts:
    - `type Reporter = { userId: string } | { participantId: string; apiKeyId: string }`.
    - `sideOf(tournament, match, by: { userId } | { participantId })` uses `getParticipant` or `getParticipantById`. `requestHelp` passes `{ userId }`.
    - Move the body of `reportResult` into a private `report(tournament, matchId, by, scores)`. The upserted row sets `userId: 'userId' in by ? by.userId : null` and `apiKeyId: 'apiKeyId' in by ? by.apiKeyId : null` in both `values` and `onConflictDoUpdate.set`.
    - `reportResult(tournament, matchId, userId, scores)` keeps its signature and returns `report(…, { userId }, …)`.
    - New `reportForParticipant(tournament, matchId, by: { participantId: string; apiKeyId: string }, scores)`.
  - apiKeys.ts: `verifyApiKey(key, now = new Date())` returns `{ id, orgId, name }`. It updates `lastUsedAt: now` only when it is null or at least `LAST_USED_INTERVAL = 60_000` ms old (a module const with a comment).
    Files: src/lib/server/services/participants.ts, tournaments.ts, requirements.ts, matches.ts, apiKeys.ts
    Verify: `corepack pnpm check` has 0 errors, and `corepack pnpm test:unit --run` still passes (the existing reportResult and API key tests are unchanged).

- [ ] 3. Schema change and migration. In `matchMessages`:
  - `authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' })` without `.notNull()`. Comment: "`null` for messages posted with an API key".
  - Add `apiKeyName: text('api_key_name')`. Comment: "The name of the API key that posted it, copied so the label stays when the key is revoked."
  - Update the table's doc comment if needed.
  - Then run `corepack pnpm db:generate --name api_key_messages` and `corepack pnpm db:migrate`.
    Files: src/lib/server/db/schema.ts, drizzle/0004_api_key_messages.sql, drizzle/meta/0004_snapshot.json, drizzle/meta/\_journal.json (generated, never hand-edited)
    Verify: the SQL contains `ALTER COLUMN "author_id" DROP NOT NULL` and `ADD COLUMN "api_key_name" text`, and `corepack pnpm db:migrate` succeeds.

- [ ] 4. Chat for API keys and the room labels:
  - chat.ts:
    - `ChatMessage.author` becomes `{ username; displayName; avatarUrl: string | null } | null` ("`null` when an API key wrote it"), and gains `apiKey: string | null` ("The name of the API key that wrote it").
    - `listMessages` uses `.leftJoin(users, …)` and selects `apiKey: matchMessages.apiKeyName`. Drizzle returns `author: null` when the left-joined user columns are all null.
    - `postMessage(tournament, matchId, author: { userId: string; organizer: boolean } | { apiKeyName: string }, body)`: the match lookup stays ("Match not found.", `not_found`). For `apiKeyName` it skips the player check and inserts `{ matchId, authorId: null, apiKeyName, asOrganizer: true, body }`; the returned message has `author: null, apiKey: apiKeyName`. User messages set `apiKey: null`. Both publish `{ type: 'chat', … }`. Update the doc comment to mention API keys.
  - MatchChat.svelte: `<strong>{message.author?.displayName ?? message.apiKey}</strong>`, and after the organizer badge `{#if message.apiKey}<span class="badge">{m.chat_api_key()}</span>{/if}`.
  - matches/[id]/+page.svelte: `match.decidedBy === 'api_key' ? m.room_by_api_key() : match.decidedBy ? m.room_by_organizer() : m.room_by_players()`.
  - en.json: `"chat_api_key": "API key"` and `"room_by_api_key": "This result was set through the API."`.
    Files: src/lib/server/services/chat.ts, src/lib/components/MatchChat.svelte, src/routes/t/[org]/[tournament]/matches/[id]/+page.svelte, messages/en.json
    Verify: `corepack pnpm check` has 0 errors after the matches.db.spec.ts update in item 6.

- [ ] 5. Add the API key guard `src/lib/server/auth/apiKey.ts`:
  - `export type ApiKeyAccess = NonNullable<Awaited<ReturnType<typeof verifyApiKey>>>`.
  - `requireApiKey(event: Pick<RequestEvent, 'request'>)`:
    - It matches the header with `/^Bearer (\S+)$/i`.
    - A missing or malformed header throws `error(401, 'Send an API key in the Authorization header: Bearer tm_….')`.
    - A failed `verifyApiKey` throws `error(401, 'The API key is invalid or has been revoked.')`.
  - `requireApiTournament(key, tournamentId)` uses `getTournamentById`. A missing tournament or one with `orgId !== key.orgId` throws `error(404, 'Tournament not found.')`.
  - Doc comments in the tone of `org.ts` and `tournament.ts`.
    Files: src/lib/server/auth/apiKey.ts
    Verify: covered by item 6.

- [ ] 6. FEAT-001 tests:
  - New `src/lib/server/auth/apiKey.db.spec.ts`:
    - A valid header returns `{ orgId, name }`.
    - Missing header, `Basic x`, `Bearer nope`, tampered key and revoked key all give 401 (use `isHttpError(e, 401)`).
    - `requireApiTournament` returns its own org's tournament and gives 404 for another org's tournament and for a random uuid.
    - Throttle: `verifyApiKey(key, t0)`, then `t0+30s` keeps `lastUsedAt === t0`, then `t0+60s` updates it (read through `listApiKeys`).
  - matches.db.spec.ts:
    - Fix the chat test's `m.author.username` → `m.author?.username`.
    - Add `reportForParticipant`: agree completes the match, the stored row has `source 'participant'`, `apiKeyId` set and `userId` null; mixing a player report with an API report disputes it; a non-player participant gives `kind 'invalid'`.
    - `setMatchResult` with `{ apiKeyId }` gives `decidedBy 'api_key'` and one `api_key` row.
    - `postMessage` with `{ apiKeyName: 'Bot' }` gives `asOrganizer true, author null, apiKey 'Bot'`, is listed and published, and keeps its label after `revokeApiKey`.
    - Get the key id from `verifyApiKey((await createApiKey(org.id, 'Bot', owner.id)).key)`; hoist `org` to a `let`.
  - tournaments.db.spec.ts: `deleteDraftTournament` (draft deleted, published rejected); `setSeeds` (reorders, rejects incomplete or duplicate orders with kind `invalid`, rejects after start); `removeParticipant` and `setCheckedIn` with an unknown id give `not_found`; `addParticipant` of an unknown user gives `invalid`; `setStructure` after start gives `conflict`.
  - requirements.spec.ts: `parseModuleConfig` (tetrio valid and invalid) and `parseRequirements` (unknown module, duplicate, invalid config, valid).
    Files: src/lib/server/auth/apiKey.db.spec.ts, src/lib/server/services/matches.db.spec.ts, tournaments.db.spec.ts, requirements.spec.ts
    Verify: `corepack pnpm check` has 0 errors, and `corepack pnpm test:unit --run` passes, now 25 files and 289 + new tests.

- [ ] 7. Error envelope `src/lib/server/api/errors.ts` (pure: zod, `@sveltejs/kit`, `ServiceError` only):
  - `ERROR_CODES = { 400: 'invalid_request', 401: 'unauthorized', 404: 'not_found', 405: 'method_not_allowed', 409: 'conflict', 422: 'unprocessable', 500: 'internal_error' } as const`.
  - `errorSchema` = `z.object({ error: z.object({ code: z.enum(Object.values(ERROR_CODES)), message: z.string(), issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() })).optional() }) })` with `.describe(…)`.
  - `apiError(status, message, issues?)` returns `json(body, { status, headers })`. For 401 it adds `www-authenticate: Bearer`. A status outside the table becomes 400 `invalid_request` (4xx) or 500 `internal_error`.
  - `errorResponse(e: unknown)` maps as in decision 4. Zod issue paths turn symbols into strings, and the message is `issues[0].message`.
  - Unit test `errors.spec.ts`:
    - ZodError → 400 with issues.
    - Each ServiceError kind → 409/422/404.
    - `error(401)` → 401 with the header, and `error(404)` → 404.
    - An unknown Error → 500 (spy `console.error`).
    - The body shape parses with `errorSchema`.
      Files: src/lib/server/api/errors.ts, src/lib/server/api/errors.spec.ts
      Verify: `corepack pnpm test:unit --run src/lib/server/api/errors.spec.ts` passes.

- [ ] 8. OpenAPI builder `src/lib/server/api/openapi.ts` (pure):
  - Types and `defineEndpoint`:
    - `type Method`, `type Tag`, and `TAGS` (name and description, in the order above).
    - `interface Endpoint` (fields as in decision 1; `response: { status: 200 | 201; description; schema: z.ZodType } | { status: 204; description }`; `conflicts?: readonly (409 | 422)[]`).
    - `const defineEndpoint = <const E extends Endpoint>(e: E) => e`.
  - `buildOpenApiDocument(endpoints: readonly Endpoint[], registry)`:
    - Components: `z.toJSONSchema(registry, { io: 'input', uri: (id) => '#/components/schemas/' + id }).schemas`, with `$schema` and `$id` stripped from each.
    - Parameters: path params from `params.shape` (`in: 'path'`, `required: true`, `description: field.description`, `schema` from `z.toJSONSchema(field, { io: 'input' })` stripped). Query params from `query.shape` (`required: !field.isOptional()`).
    - Request body: `requestBody: { required: true, content: { 'application/json': { schema } } }`.
    - `schemaRef(schema)`: a registered schema gives a `$ref`. A `z.ZodArray` of a registered element gives `{ type: 'array', items: { $ref } }`. Anything else throws `Error('Register the API schema of <operationId> in components.')`.
    - Responses: the success status (plus content unless 204); 400 if body or query; 401 always; 404 if params; 409/422 from `conflicts`. Every error response points at `#/components/schemas/Error`.
    - Document: `openapi: '3.1.0'`, `info { title: 'Tournament Manager API', version: '1.0.0', description }`, `servers: [{ url: '/api/v1' }]`, `security: [{ apiKey: [] }]`, `tags`, `paths`, and `components { securitySchemes: { apiKey: { type: 'http', scheme: 'bearer', description } }, schemas }`.
  - Export `type OpenApiDocument` (the return type) and use `z.core.JSONSchema.JSONSchema` for schema types.
    Files: src/lib/server/api/openapi.ts
    Verify: `corepack pnpm check` has 0 errors. The behavior is covered by item 12.

- [ ] 9. Schemas and serializers:
  - `api/schemas.ts`:
    - `export const components = z.registry<{ id: string }>()`, then `errorSchema.register(components, { id: 'Error' })`.
    - Register every schema below with `.describe(…).register(components, { id })`. Field-level `.describe()` texts are short.
    - Request bodies, reusing service schemas:
      - `createTournamentBody = tournamentSchema.pick({ name: true, slug: true })` → TournamentCreate.
      - `updateTournamentBody = tournamentSchema.extend({ startsAt: z.iso.datetime({ offset: true }).transform((v) => new Date(v)).nullable() }).partial()` → TournamentUpdate.
      - `themeBody` {themeId: z.string()} → ThemeUpdate.
      - `requirementResource` {moduleId: z.string().min(1), config: z.record(z.string(), z.unknown())} → Requirement.
      - `requirementsBody` {requirements: z.array(requirementResource)} → RequirementsUpdate.
      - Register `stageSettingsSchema` → StageSettings and `stageConfigSchema` → StageConfig.
      - `structureBody` {stages: structureSchema} → StructureUpdate.
      - `addParticipantBody` {username: z.string().trim().min(1, 'Username is required.')} → ParticipantAdd.
      - `seedsBody` {participantIds: z.array(z.uuid())} → SeedOrder.
      - `checkInBody` {checkedIn: z.boolean()} → CheckInUpdate.
      - `scoresTuple = z.tuple([score, score])` with `score = z.int('Scores must be whole numbers, zero or more.').min(0, …).max(999_999_999)` → Scores.
      - `resultBody` {scores} → ResultUpdate.
      - `reportBody` {participantId: z.uuid(), scores} → ReportCreate.
      - `messageBody` {body: messageSchema} → MessageCreate.
    - Responses:
      - `tournamentResource` → Tournament: id, slug, name, description, status `z.enum(tournamentStatus.enumValues)`, startsAt iso|null, participantLimit int|null, themeId, createdAt iso.
      - `tournamentSummaryResource` → TournamentSummary: id, slug, name, status, startsAt, participants int.
      - `stageResource` → Stage: id, index, type `z.enum(stageType.enumValues)`, status `z.enum(stageStatus.enumValues)`, settings `stageSettingsSchema`, groups `[{ participantIds: uuid[], standings: [{ participantId, rank: int|null }] }]`.
      - `requirementCheckResource` → RequirementCheck: moduleId, moduleName, status `enum ok|missing|ineligible|unavailable`, `reason?`.
      - `participantResource` → Participant: id, userId, username, displayName, seed, checkedInAt, finalRank, createdAt, requirements.
      - `matchResource` → Match: id, number, stageIndex, groupIndex, side `enum main|winners|losers|grand_final|third_place`, status `enum waiting|ready|reported|disputed|completed|bye|skipped` (`satisfies readonly MatchProgress[]`), `entrants [uuid|null, uuid|null]` (null = not known yet), `result {scores: Scores|null, winnerId: uuid|null} | null`, helpRequested, `reports [{ participantId, scores }]`.
      - `matchDetailResource` → MatchDetail: matchResource extended with `decidedBy enum organizer|api_key | null`.
      - `reportOutcomeResource` → ReportOutcome: `outcome enum saved|agreed|disputed`, `match: matchDetailResource`.
      - `messageResource` → Message: id, body, createdAt, asOrganizer, `author {username, displayName} | null`, `apiKey string|null`.
    - Params (not registered):
      - `tournamentParams = z.object({ tournamentId: z.uuid('Tournament not found.').describe('The tournament id.') })`.
      - `participantParams = tournamentParams.extend({ participantId: z.uuid('Participant not found.').describe(…) })`.
      - `matchParams = tournamentParams.extend({ matchId: matchIdSchema.describe('The match id.') })`.
      - `matchQuery = z.object({ stage: z.coerce.number().int().min(0).optional().describe(…), status: <match status enum>.optional().describe(…) })`.
  - `api/responses.ts`: `toTournament(row)`, `toSummary(row)`, `toStages(bracket)`, `toParticipants(tournamentId)` (async: `listParticipants` + `checkRequirements`; `reason` only for `ineligible`), `toMatch(item: MatchItem)`, `toMatchDetail(detail)`, `toMessage(message: ChatMessage)`. Return types are `z.input<typeof …>`, and dates go through `toISOString()`. For match results: `winnerId` is `result.winner === null ? null : result.entrants[result.winner]`, `scores ?? null`, and each report's `participantId` is `item.entrants[report.side]`.
    Files: src/lib/server/api/schemas.ts, src/lib/server/api/responses.ts
    Verify: `corepack pnpm check` has 0 errors.

- [ ] 10. Handler wrapper `src/lib/server/api/handler.ts`:
  - Types:
    - `type Input<E, K extends 'params' | 'query' | 'body'> = E extends { [P in K]: infer S extends z.ZodType } ? z.output<S> : undefined`.
    - `type Result<E extends Endpoint> = E['response'] extends { schema: infer S extends z.ZodType } ? z.input<S> : void`.
    - `interface ApiContext<E> { event: RequestEvent; key: ApiKeyAccess; params; query; body }`.
    - This typing was compiled successfully during planning.
  - `endpoint<E extends Endpoint>(definition: E, run: (context: ApiContext<E>) => Promise<Result<E>>)` returns `Object.assign(handler, { endpoint: definition })`. Inside a try:
    1. `requireApiKey(event)`.
    2. `definition.params?.safeParse(event.params)`; on failure `error(404, issues[0].message)`.
    3. `definition.query?.parse(Object.fromEntries(event.url.searchParams))`.
    4. `definition.body?.parse(await readJson(event.request))`. `readJson` turns a JSON parse failure into `error(400, 'The request body must be JSON.')`.
    5. `run(...)`.
    6. `json(result, { status })`, or `new Response(null, { status: 204 })`.
  - The catch returns `errorResponse(e)`.
  - Also export `methodNotAllowed: RequestHandler = () => apiError(405, 'This method is not allowed here.')`.
    Files: src/lib/server/api/handler.ts
    Verify: `corepack pnpm check` has 0 errors.

- [ ] 11. Endpoint definitions and routes:
  - `api/endpoints.ts`: the 29 `defineEndpoint` consts named by operationId (table above), each with a one-sentence `summary` and a `description` where behavior needs it. Examples:
    - addParticipant skips requirements and the limit, like the Participants tab.
    - deleteTournament is drafts only.
    - setMatchResult is an organizer override that replaces reports and clears disputes and help.
    - reportMatch reports for one player, and the same scores from both sides decide the match.
    - postMessage shows as an organizer message labelled with the key's name.
    - open-check-in closes sign-ups.
  - Then `export const endpoints = [ …all 29 in table order ] as const` and `export const openApiDocument = buildOpenApiDocument(endpoints, components)`.
  - Routes under `src/routes/api/v1/`:
    - The 21 files in the Digest. Each imports `* as api from '#lib/server/api/endpoints.ts'`, `endpoint`, `methodNotAllowed`, the service functions and the `to*` serializers.
    - Each loads `t` with `requireApiTournament(key, params.tournamentId)` where needed, calls the service, returns the serializer output, and ends with `export const fallback = methodNotAllowed;`.
    - Lifecycle routes return `toTournament((await getTournamentById(t.id))!)`.
    - `matches/+server.ts` filters `listMatches(await getBracket(t.id))` by `query.stage` (stageIndex) and `query.status` (progress).
    - `getMatch` and `listMessages` throw `error(404, 'Match not found.')` when `getMatch` returns undefined.
    - `setRequirements` throws `new ServiceError(parsed.error, 'invalid')` when `parseRequirements` fails.
  - Plus `openapi.json/+server.ts` (`GET = () => json(openApiDocument)`, no auth, fallback) and `[...path]/+server.ts` (`fallback = () => apiError(404, 'There is no such endpoint.')`).
    Files: src/lib/server/api/endpoints.ts, src/routes/api/v1/\*\*/+server.ts (23 files)
    Verify: `corepack pnpm check` has 0 errors and `corepack pnpm lint` passes after `corepack pnpm format`.

- [ ] 12. FEAT-002 tests (db project, because they import services and routes):
  - `src/lib/server/api/handler.db.spec.ts` uses a test-local `defineEndpoint` with params, query and body schemas, and a fake event (`{ request: new Request(url, init), params, url } as unknown as RequestEvent`). It checks:
    - No key → 401 envelope with `www-authenticate`.
    - A valid key with a bad param → 404.
    - Invalid JSON → 400.
    - A body failing Zod → 400 with `issues[].path`.
    - A run that throws a `ServiceError` conflict → 409.
    - Success → 200/201 JSON, and the 204 variant has an empty body.
    - `methodNotAllowed` → 405 envelope.
  - `src/lib/server/api/openapi.db.spec.ts` imports `endpoints` and `openApiDocument`. It checks:
    - The document: `openapi === '3.1.0'`, `servers[0].url === '/api/v1'`, `components.securitySchemes.apiKey` is `{ type: 'http', scheme: 'bearer' }`, `security` is `[{ apiKey: [] }]`, `components.schemas.Error` exists.
    - Endpoints: every endpoint is at `paths[path][method.toLowerCase()]` with its operationId; operationIds are unique; every tag is listed in `tags`; every `{param}` has a required path parameter.
    - `$ref`s and leftovers: a recursive walk finds every `$ref` resolving to an existing `components.schemas` entry, and no `$schema`/`$id` left in components.
    - Route coverage: `import.meta.glob('/src/routes/api/v1/**/+server.ts', { eager: true })` excludes `openapi.json` and `[...path]` and maps each file to its OpenAPI path (`[x]` → `{x}`). Each exported HTTP method must carry `.endpoint` with the same method and path, and be in `endpoints`. Each file exports `fallback`. The served set equals `endpoints`, with 29 items.
      Files: src/lib/server/api/handler.db.spec.ts, src/lib/server/api/openapi.db.spec.ts
      Verify: `corepack pnpm test:unit --run src/lib/server/api` passes, and then the full `corepack pnpm test:unit --run` passes.

- [ ] 13. Docs reference model `src/lib/server/api/reference.ts` (pure, type-only import from `./openapi`):
  - `apiReference(document)` returns `{ tags: [{ name, description, operations: [{ id, method, path: '/api/v1' + path, summary, description, parameters: [{ name, in, type, ref, required, description }], body: { type, ref } | null, responses: [{ status, description, type, ref }] }] }], schemas: [{ name, description, type, fields: [{ name, type, ref, required, description }], json }] }`.
  - Order: tags in document order, operations in `paths` order, responses by status, schemas by name. `json` is `JSON.stringify(schema, null, 2)`.
  - `typeLabel(schema)`:
    - `$ref` → its name; `anyOf`/`oneOf` → labels joined with `|`; `enum` → JSON values joined with `|`.
    - Arrays: `prefixItems` → `[a, b]`; `items` → `label[]`, with unions parenthesized.
    - Strings: `string` with `format` → `string (uuid)`.
    - Objects without `properties` → `object`; fallback `any`.
  - `ref` is the component name for a `$ref`, for array items that are refs, and for nullable refs.
  - Unit test `reference.spec.ts` uses a hand-written mini document and covers grouping and order, the typeLabel cases, required flags and refs.
    Files: src/lib/server/api/reference.ts, src/lib/server/api/reference.spec.ts
    Verify: `corepack pnpm test:unit --run src/lib/server/api/reference.spec.ts` passes.

- [ ] 14. Docs page and links:
  - `src/routes/docs/api/+page.server.ts` returns `{ reference: apiReference(openApiDocument), errors: Object.entries(ERROR_CODES) }`.
  - `+page.svelte`:
    - `<svelte:head><title>{m.api_docs_title()} · {m.app_name()}</title>`, `h1`, lead text.
    - `<nav aria-label={m.api_docs_contents()}>` with fragment links to the sections.
    - An Authentication section (`aria-labelledby`): create the key on the API keys tab, the header in a `<pre><code>`, and a curl example built with `page.url.origin`.
    - An Errors section: the envelope example plus a status/code table.
    - A link to the OpenAPI document via `resolve('/api/v1/openapi.json')`.
    - One `<section aria-labelledby>` per tag. Each operation is an `<article id="op-<id>">` with `<h3><span class="method">{method}</span> <code>{path}</code></h3>`, the summary and description, a parameters table (`<th scope="col">`), the request body and a responses table. Type labels link to `#schema-<ref>` when `ref` is set.
    - A Schemas section with an `h3 id="schema-<name>"` per schema, a fields table and `<details><summary>{m.api_docs_json_schema()}</summary><pre><code>{json}</code></pre></details>`.
    - Local SCSS uses only tokens (`--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--radius-sm`), with a monospace stack for code and `overflow-x: auto` on `pre`.
  - Root layout: a `<footer>` after `<main>` with `<a href={resolve('/docs/api')}>{m.footer_api_docs()}</a>`, styled muted with a top border.
  - API keys page: append ` <a href={resolve('/docs/api')}>{m.api_keys_docs()}</a>` to the lead paragraph.
  - en.json keys: `footer_api_docs`, `api_keys_docs`, `api_docs_title`, `api_docs_lead`, `api_docs_contents`, `api_docs_auth_title`, `api_docs_auth_create`, `api_docs_auth_header`, `api_docs_auth_scope`, `api_docs_example`, `api_docs_errors_title`, `api_docs_errors_lead`, `api_docs_spec`, `api_docs_spec_lead`, `api_docs_parameters`, `api_docs_request_body`, `api_docs_responses`, `api_docs_schemas`, `api_docs_name`, `api_docs_in`, `api_docs_type`, `api_docs_required`, `api_docs_description`, `api_docs_status`, `api_docs_code`, `api_docs_no_content`, `api_docs_json_schema`, `api_docs_yes`. The texts are in FEAT-003.
    Files: src/routes/docs/api/+page.server.ts, src/routes/docs/api/+page.svelte, src/routes/+layout.svelte, src/routes/o/[org]/admin/api-keys/+page.svelte, messages/en.json
    Verify: `corepack pnpm check` has 0 errors, and `corepack pnpm lint` passes after format.

- [ ] 15. e2e:
  - `e2e/helpers.ts` gains `createApiKey(page, orgSlug, name)`: it goes to `/o/<slug>/admin/api-keys`, fills `getByLabel('Name', { exact: true })`, clicks Create key, expects `new-api-key` to match `/^tm_[0-9a-f]{8}_/` and returns its text.
  - New `e2e/api.e2e.ts` with two tests, using Playwright's `request` fixture (no cookies) with per-request `headers: { authorization: 'Bearer ' + key }` and `data` for JSON bodies.
  - Test 1, "create → start → report via key" (`test.slow()`):
    - UI setup: the owner signs in and creates org A, and its key is "Discord bot". The owner creates org B with key "Other bot". Four players sign in once through `playerPage` to create their users, then each page is closed.
    - Tournament setup over the API:
      - POST /tournaments → 201.
      - PUT /stages: single elimination with `thirdPlaceMatch: true` and the other settings at their defaults → GET /stages shows it.
      - POST /open-registration → `registration`.
      - POST /participants ×4 → 201. An unknown username → 422 `unprocessable`.
      - PUT /participants/seeds in player order.
      - POST /start → `running`.
      - PUT /stages again → 409 `conflict`.
      - GET /matches?status=ready → 2 semis. GET /matches?stage=0 → 4 matches.
    - Results:
      - PUT semi #1 /result [2,0] → `completed`, `decidedBy 'api_key'`.
      - POST semi #2 /reports for p2 [2,1] → `saved`; for p3 [2,1] → `agreed` and `completed`.
      - POST the final's /messages "Final is up" → 201 `{ apiKey: 'Discord bot', asOrganizer: true, author: null }`.
      - PUT the final [3,1] and the third-place match [2,0].
      - GET /tournaments/{id} → `completed`.
    - Other organization: with org B's key, GET /tournaments/{id} → 404 `not_found`, PUT its result → 404, and GET /tournaments doesn't list it.
    - UI checks:
      - `${path}/bracket`: `.placements li` first contains p1.
      - `${path}/matches`: the final's row contains Done and `3–1`.
      - The final's room: the log item "Final is up" contains "Discord bot" and the badges `Organizer` and `API key` (exact), and the page shows "This result was set through the API.".
  - Test 2, "errors, spec and docs": the owner signs in, creates an org and a key.
    - No header → 401 `unauthorized`, with a `www-authenticate` header.
    - `Bearer tm_00000000_` + 43 × `a` → 401.
    - POST /tournaments `{ name: '', slug: 'X' }` → 400 `invalid_request`, and the issue paths include `['name']` and `['slug']`.
    - GET /api/v1/nope → 404 `not_found` JSON. DELETE /api/v1/tournaments → 405 `method_not_allowed`.
    - GET /api/v1/openapi.json without a key → 200, `openapi '3.1.0'`, and `paths` include `/tournaments`, `/tournaments/{tournamentId}/stages`, `/tournaments/{tournamentId}/matches/{matchId}/result`, `…/reports` and `…/messages`.
    - Revoke the key in the UI → the next call is 401.
    - Docs: from the API keys page, click `getByRole('main').getByRole('link', { name: 'Read the API documentation' })` → `/docs/api`. The h1 is "API documentation", and the heading `PUT /api/v1/tournaments/{tournamentId}/matches/{matchId}/result` and the Authentication heading are visible. The footer has `getByRole('contentinfo').getByRole('link', { name: 'API documentation', exact: true })`.
      Files: e2e/helpers.ts, e2e/api.e2e.ts
      Verify: `$env:PATH = "$env:LOCALAPPDATA\corepack-shims;$env:PATH"; corepack pnpm test:e2e e2e/api.e2e.ts` passes, and then the full `test:e2e` passes (9 existing plus 2 new).

- [ ] 16. Docs:
  - docs/PLAN.md:
    - The M7 row reads `M7 ✅`.
    - The Stack line says the spec is generated with `z.toJSONSchema`, not `zod-openapi`.
    - The architecture tree: `auth/` lists `requireApiKey`; `api/` holds "endpoint definitions, error envelope, zod schemas -> OpenAPI"; routes add `docs/api`.
    - The data model: `match_messages (matchId, authorId or apiKeyName, asOrganizer, body, createdAt)`.
    - Add `## Implementation notes (M7)` after the M6 notes, in the same terse style. It covers: definitions plus the `endpoint()` wrapper with one source for the spec and the route coverage test; `z.toJSONSchema` over `zod-openapi`; the key guard, org scoping, the 404 for other orgs, the `lastUsedAt` throttle, no CORS, and rate limiting still open; the envelope and the status mapping by `ServiceError.kind`, including unknown routes and methods; API results as `api_key` reports and `reports` on behalf of a player; key messages labelled by the copied name; delete only for drafts; `/docs/api`; send JSON because SvelteKit's CSRF check rejects form content types without a matching Origin.
  - README.md: a `## REST API` section after Bracket themes covering how to create a key (org admin, API keys tab, shown once), `Authorization: Bearer tm_<prefix>_<secret>` with a curl example, that keys are org-scoped, and where `/api/v1/openapi.json` and `/docs/api` are.
    Files: docs/PLAN.md, README.md
    Verify: `corepack pnpm lint` passes after `corepack pnpm format`.

- [ ] 17. Full verification: `corepack pnpm format`; `corepack pnpm check` (0 errors, 0 warnings); `corepack pnpm lint`; `corepack pnpm test:unit --run` (all pass); `$env:PATH = "$env:LOCALAPPDATA\corepack-shims;$env:PATH"; corepack pnpm test:e2e` (all pass, about 11 tests). Record the counts in the FEAT findings for the commit message.

## Risks and open items

- **Duplicate registry ids under HMR.** The registry lives in `schemas.ts`, the module that fills it, so a dev reload re-creates both.
- **The builder throws for unregistered body or response schemas,** and the openapi db test runs the builder, so a missing registration fails the tests instead of shipping an inline duplicate.
- **SvelteKit CSRF.** Form content types (`text/plain`, `x-www-form-urlencoded`, `multipart`) without a matching Origin get a plain-text 403 from SvelteKit before our code runs. The docs, README and notes say to send `application/json`.
- **405 relies on `fallback` exports,** which the route coverage test enforces.
- **`getMatch` is heavy** (it builds the bracket). That is fine at this scale and the same as the room page.
- **Playwright strict mode.** "API documentation" also matches "Read the API documentation", so the e2e scopes links with `exact` or a landmark.
- **Open:** rate limiting, multi-process SSE (as in M6), and the six minor M6 review findings, which are scheduled for M8. Don't touch them.

## Digest

The files to change, what to change in each, and the tests that cover them. Baseline: `corepack pnpm check` 0/0, `corepack pnpm test:unit --run` 24 files and 289 tests pass, e2e 9 (M6).

- `src/lib/server/services/errors.ts`: the whole file is `export class ServiceError extends Error { override name = 'ServiceError'; }`. Add `ServiceErrorKind` and the `kind` field and constructor (item 1). Covered by errors.spec.ts and the db specs.
- `src/lib/server/services/matches.ts`:
  - `loadMatch` at line 44: change `'Match not found.'` → `not_found`.
  - `resultFor` at line 61: both throws → `invalid`.
  - `sideOf(tournament, match, userId)` at line 99: takes `by: { userId } | { participantId }`.
  - `reportResult(tournament, matchId, userId, scores)` at line 154: body moves into `report(…)`. The insert is at lines 175–188 (`values({ matchId, source: 'participant', participantId, ...report })` + `onConflictDoUpdate`). The `'Only the players of this match can report its result.'` throw at line 167 → `invalid`.
  - `requestHelp` at line 195: `sideOf(…, { userId })`.
  - `clearHelp` at line 213: `'Match not found.'` → `not_found`.
  - Add `reportForParticipant`.
  - `type Override = { userId } | { apiKeyId }` (line 111) and `setMatchResult` stay as they are.
  - Tests: matches.db.spec.ts and tournaments.db.spec.ts.
- `src/lib/server/services/chat.ts` (85 lines):
  - `ChatMessage` at lines 16–24.
  - `listMessages` at lines 32–45 (innerJoin → leftJoin, plus `apiKey`).
  - `postMessage` at lines 51–85: author union; the `'Match not found.'` throw at line 62 → `not_found`.
  - Test: the chat describe block in matches.db.spec.ts (fix `m.author.username` at about line 260).
- `src/lib/server/services/participants.ts`:
  - `addParticipant` at lines 176–188 returns the id.
  - `removeParticipant` at lines 189–195 and `setCheckedIn` at lines 196–207 get `.returning` and a not_found throw.
  - Add `getParticipantById` after `getParticipant` (line 72) and `setSeeds` after `writeSeeds` (line 209).
  - Test: tournaments.db.spec.ts.
- `src/lib/server/services/tournaments.ts`:
  - `setTheme` at line 94 throws → `invalid`.
  - Add `deleteDraftTournament` after `deleteTournament` (line 99).
  - The `setStructure` parse throw → `invalid`.
  - Test: tournaments.db.spec.ts.
- `src/lib/server/services/requirements.ts`: `readModuleConfig` at lines 44–65; the tail (`if (!module.tournamentConfig) …` through the end) becomes `parseModuleConfig`. Add `parseRequirements`. Test: requirements.spec.ts, which already uses `tetrioModule({ clientId: 'x', clientSecret: 'y' })`.
- `src/lib/server/services/apiKeys.ts`: `verifyApiKey(key)` at lines 58–71 gets `now` and the throttle, and returns `name`. Tests: organizations.db.spec.ts 'API keys' (unchanged, still passes) and the new apiKey.db.spec.ts.
- `src/lib/server/db/schema.ts`: `matchMessages` at line 284 (the last table, before the type exports): `authorId` loses `.notNull()`, and add `apiKeyName: text('api_key_name')`. Migration `drizzle/0004_api_key_messages.sql` + `meta/0004_snapshot.json` + `_journal.json`, all generated.
- `src/lib/components/MatchChat.svelte`: line 23 `<strong>{message.author.displayName}</strong>` → the nullable form plus the API key badge.
- `src/routes/t/[org]/[tournament]/matches/[id]/+page.svelte`: line 130 `<p>{match.decidedBy ? m.room_by_organizer() : m.room_by_players()}</p>` in the result card → three-way.
- `src/routes/+layout.svelte`: add `<footer>` after `<main class="container">…</main>` (before the hidden locales div), plus styles.
- `src/routes/o/[org]/admin/api-keys/+page.svelte`: line 17 `<p class="muted">{m.api_keys_lead()}</p>` → append the docs link.
- `messages/en.json`: add the keys from items 4 and 14. Keep the existing order and append new keys at the end, as earlier milestones did.
- `e2e/helpers.ts`: add `createApiKey` (the pattern is the API keys steps in `e2e/organizations.e2e.ts`).
- New: `src/lib/server/auth/apiKey.ts` (+ `.db.spec.ts`) and `src/lib/server/api/{errors.ts, errors.spec.ts, openapi.ts, schemas.ts, responses.ts, handler.ts, endpoints.ts, handler.db.spec.ts, openapi.db.spec.ts, reference.ts, reference.spec.ts}`.
- New: `src/routes/docs/api/{+page.server.ts, +page.svelte}`, `e2e/api.e2e.ts`.
- New routes under `src/routes/api/v1/`:
  - `tournaments/+server.ts`: GET, POST.
  - `tournaments/[tournamentId]/+server.ts`: GET, PATCH, DELETE.
  - `tournaments/[tournamentId]/theme/+server.ts`: PUT.
  - `tournaments/[tournamentId]/requirements/+server.ts`: GET, PUT.
  - `tournaments/[tournamentId]/open-registration/+server.ts`, `open-check-in/+server.ts`, `unpublish/+server.ts`, `start/+server.ts` and `start-next-stage/+server.ts`: POST each.
  - `tournaments/[tournamentId]/stages/+server.ts`: GET, PUT.
  - `tournaments/[tournamentId]/participants/+server.ts`: GET, POST.
  - `tournaments/[tournamentId]/participants/seeds/+server.ts`: PUT.
  - `tournaments/[tournamentId]/participants/shuffle/+server.ts`: POST.
  - `tournaments/[tournamentId]/participants/[participantId]/+server.ts`: DELETE.
  - `tournaments/[tournamentId]/participants/[participantId]/check-in/+server.ts`: PUT.
  - `tournaments/[tournamentId]/matches/+server.ts`: GET.
  - `tournaments/[tournamentId]/matches/[matchId]/+server.ts`: GET.
  - `tournaments/[tournamentId]/matches/[matchId]/result/+server.ts`: PUT, DELETE.
  - `tournaments/[tournamentId]/matches/[matchId]/reports/+server.ts`: POST.
  - `tournaments/[tournamentId]/matches/[matchId]/help/+server.ts`: DELETE.
  - `tournaments/[tournamentId]/matches/[matchId]/messages/+server.ts`: GET, POST.
  - `openapi.json/+server.ts`: GET.
  - `[...path]/+server.ts`: fallback.
- `docs/PLAN.md`: the milestones table row `| M7        | REST API + OpenAPI + docs page |…`, the Stack bullet "generates the OpenAPI spec (`zod-openapi`)", the architecture tree, the data model bullet with `match_messages`, and the new M7 notes after "## Implementation notes (M6)". `README.md`: the new section after "## Bracket themes".
- Unchanged but relied on: `requireTournamentAdmin`/UI actions (they still catch `ServiceError` → `fail(400, { error: e.message })`); `listOrgTournaments`, `getTournamentById`, `getStructure`, `setStatus`, `startTournament`, `startNextStage`, `getBracket`, `listMatches`, `getMatch`, `setMatchResult`, `clearMatchResult`, `clearHelp`, `listParticipants`, `checkRequirements`, `shuffleSeeds`, `writeSeeds`, `getRequirements`, `setRequirements`, `listModules` (registry), `structureSchema`/`stageSettingsSchema`/`stageConfigSchema` (`#lib/tournaments.ts`), `tournamentSchema` (services/tournaments.ts), `messageSchema` (chat.ts), `matchIdSchema` (matches.ts).
