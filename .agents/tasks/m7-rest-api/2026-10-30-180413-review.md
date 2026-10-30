# REST API with OpenAPI spec and docs page (M7)

M7 adds an org-scoped REST API under `/api/v1`, authenticated with `Authorization: Bearer tm_<prefix>_<secret>`, a public OpenAPI 3.1 document at `/api/v1/openapi.json`, and a `/docs/api` reference page rendered from that document. Every operation is declared once in `api/endpoints.ts` with its Zod schemas; the `endpoint()` wrapper authenticates, validates and maps errors to one envelope, and the spec is built from the same list, with a db test tying every route file to a definition. The services gained what the API needed (`ServiceError.kind`, `setSeeds`, `deleteDraftTournament`, `reportForParticipant`, key-authored messages, a throttled `lastUsedAt`), one generated migration makes `match_messages.author_id` nullable and adds `api_key_name`, and PLAN.md (M7 ✅ + notes) and the README (REST API section) are updated. I re-ran `check` (0 errors, 0 warnings), `lint`, `test:unit --run` (29 files, 332 tests) and the full `test:e2e` (11 passed, 2 of them new).

Watch for: a POST, PUT, PATCH or DELETE without `Content-Type: application/json` gets SvelteKit's plain-text 403 instead of the envelope (confirmed; documented in four places; the fix touches CSRF config, so it's the user's call). The message, result-clear and help-clear routes act on bye match ids that the rest of the API answers with 404 (confirmed). Requirements set over the API store any `config` for modules that have no options (confirmed).

**Verdict**: APPROVED

## High-level view

Each route file is a thin `endpoint(api.<operationId>, run)` wrapper around a definition in `api/endpoints.ts`, plus a `fallback` that answers 405. Validation and the OpenAPI document read the same definitions; the builder refuses unregistered body and response schemas, and `openapi.db.spec.ts` matches all 29 operations one-to-one with the files under `src/routes/api/v1`. The handlers only call guards, services and serializers. The two inline checks (the `parseRequirements` result and the 404 for a missing match) delegate to service functions.

The key guard runs before path params are parsed, so a missing, malformed, unknown, tampered or revoked key gets a 401 with `WWW-Authenticate: Bearer` even when the path is also invalid, and an unauthenticated probe can't use 404 vs 401 to learn which ids exist. A tournament of another organization is the same 404 as a missing one, and the match, participant and message services filter by tournament again below that. `lastUsedAt` is written at most once a minute. No CORS headers; rate limiting is recorded as open.

Errors share one envelope: Zod failures 400 with `issues`, impossible path ids 404, and `ServiceError.kind` conflict/invalid/not_found as 409/422/404. Unknown routes go through a `[...path]` catch-all. The gap is SvelteKit's own CSRF check, which runs before the app and answers mutating requests that carry no content type with a plain-text 403. Bots making body-less POST or DELETE calls hit it unless they set the header the docs ask for.

Results set with a key go through the same `setMatchResult` override as an organizer and are stored as `api_key` reports. Reports for a player go through the same private `report()` state machine as player reports, with the key id on the row; when a key reports for both players, the room says the players agreed. A key's message is stored with no author, the key name copied in, and `asOrganizer` set; it goes out on the room's SSE and shows with Organizer and API key badges, and the copied name survives revocation. The routes that write to a match without going through `loadMatch`'s status checks don't reject bye matches first.

`/docs/api` renders the generated document with a contents nav, an Authentication section, the error codes, one section per tag with parameter and response tables, and the schemas, using landmarks, a heading per operation, `th scope="col"` and `pre > code`. Every UI string is Paraglide, colors come from tokens defined for both themes, and the footer and the API keys tab link to it.

<details>
<summary>Issues (5)</summary>

1. **CSRF 403 outside the envelope** — mutating requests without a content type get SvelteKit's plain-text 403 before the API runs. Either the user accepts the documented `Content-Type: application/json` requirement, or set `kit.csrf.checkOrigin: false` and re-apply the same origin check in `hooks.server.ts` for paths outside `/api/v1/` (the API is header-authenticated, so CSRF can't apply to it). Needs the user's go-ahead because it changes a framework security default.
2. **Bye match ids accepted by three writes** — `POST …/messages`, `DELETE …/result` and `DELETE …/help` write to a bye match that `GET …/matches/{id}` reports as not found. Call `getMatch`/`matchDetail` before the service in those routes, as `GET …/messages` does.
3. **Arbitrary config for option-less modules** — `parseModuleConfig` passes the client's `config` through unchanged when a module has no `tournamentConfig`, so the API stores jsonb the admin page can't create. Return `{}` or reject a non-empty config in that case.
4. **`bye` in the API match status enum** — `Match.status` and `?status=` list `bye`, but byes are never returned. Drop it from the API's `MATCH_STATUSES`.
5. **Unexecuted route handlers** — about half the routes (PATCH tournament, theme, requirements, unpublish, open-check-in, start-next-stage, shuffle, check-in, remove participant, delete tournament, clear result/help, list messages) only pass the coverage test. Add a db spec that calls the PATCH and requirements handlers, and a few others, with a fake event like `handler.db.spec.ts`.

</details>

<details>
<summary>Details</summary>

### Endpoint definitions as the single source for routes and spec

```
api/schemas.ts ──register──▶ components registry ──z.toJSONSchema──▶ components.schemas
       │                                                                  │
api/endpoints.ts (29 defineEndpoint) ──buildOpenApiDocument──▶ openApiDocument ─▶ /api/v1/openapi.json
       │                                                                  └──▶ api/reference.ts ─▶ /docs/api
routes/api/v1/**/+server.ts ── endpoint(def, run) ── requireApiKey → params/query/body parse → run → json | 204
```

An unregistered body or response throws `Register the API schemas of <operationId>.` when the document is built, and the openapi db test builds it, so a forgotten registration fails the tests instead of shipping an inline copy of the schema.

One spec accuracy nit (confirmed): `Match.status` and the `?status=` filter enumerate `bye`, but `listMatches` drops byes, so the API never returns that value and `?status=bye` always yields `[]`. Dropping `bye` from the API's `MATCH_STATUSES` would make the enum match the "byes are left out" description.

### SvelteKit's CSRF 403 bypasses the envelope

The envelope gap (confirmed) is outside the app's code. In production builds, SvelteKit 3's `respond.js` runs this before `handle` or any route:

```js
// node_modules/@sveltejs/kit/src/runtime/server/csrf.js
(!request.headers.get('content-type') || is_form_content_type(request)) &&
	mutating_form_methods.has(request.method) &&
	request_origin !== self_origin &&
	(!request_origin || !trusted_origins.includes(request_origin));
```

Server clients send no `Origin`, and most (curl, `fetch` without a body, Python `requests.post` without data) send no content type on body-less calls. So `POST …/start`, `…/open-registration`, `…/participants/shuffle`, `DELETE /tournaments/{id}`, `DELETE …/result` and `DELETE …/help` answer `403 Cross-site POST form submissions are forbidden` as `text/plain` (or `{ message }` with `Accept: application/json`). I reproduced it against the built server. `trustedOrigins` can't help because the origin is null. The implementer documented the workaround in the docs page, `info.description`, the README and the PLAN.md notes and left the config decision to the user.

A fix that loses nothing: the API authenticates only with the Authorization header and ignores cookies, so CSRF can't apply to `/api/v1`. Setting `kit.csrf.checkOrigin: false` and re-applying the same origin check in `hooks.server.ts` for every path outside `/api/v1/` would keep the UI protected and let the API answer with the envelope. Since that edits a framework security default, it needs the user's go-ahead.

One UI behavior change rides along with the `not_found` classification: removing or checking in a participant who no longer exists now shows "Participant not found." on the Participants tab instead of silently doing nothing.

### Bye matches in the match and message routes

Byes are stored as match rows (the engine resolves a slot with a `null` entrant to `bye`) but have no room page, and `getMatch` returns `undefined` for them. `GET …/matches/{id}` and `GET …/messages` therefore answer a bye id with 404, yet `POST …/messages` (confirmed) only checks that the row belongs to the tournament, so it writes the message, publishes it and returns 201. `DELETE …/result` and `DELETE …/help` call `clearMatchResult` and `clearHelp` before `matchDetail` 404s, so they write and then report "not found". The writes are effectively no-ops on a bye, but the responses disagree with the rest of the API. Calling `getMatch` (or `matchDetail`) before the service in those three routes, as `GET …/messages` already does, makes them consistent.

### Requirements over the API

`PUT …/requirements` runs the new pure `parseRequirements` (enabled modules, each once, options via `parseModuleConfig`) and then the existing `setRequirements`. For a module without `tournamentConfig`, `parseModuleConfig` returns the raw object unchanged (confirmed). In the UI that object is built only from `configFields`, so it's always `{}`; over the API it's whatever the client sends, so `{ "moduleId": "discord", "config": { "anything": … } }` is stored as jsonb and returned by `GET …/requirements`. Nothing reads it today, but it's state the admin page can't create. Returning `{}` (or rejecting a non-empty config) for modules without options closes it.

### Test coverage

The guard, error mapping, handler wrapper and spec structure (version, bearer scheme, global security, path params, `$ref` resolution, route coverage) each have their own tests, and the service tests cover `reportForParticipant`, key overrides, key messages surviving revocation, `setSeeds`, `deleteDraftTournament` and the new error kinds. The e2e covers the milestone flow end to end, including both result paths, the UI checks, and the 401 / other-org 404 / 400 / 409 / 422 / 405 / unknown-route cases, the public spec, revocation and the docs page.

Not tested: about half the route handlers run only through the coverage test, never executed — `PATCH /tournaments/{id}` (the merge with current values and the `startsAt` transform), `PUT …/theme`, `GET`/`PUT …/requirements`, `POST …/unpublish`, `…/open-check-in`, `…/start-next-stage`, `…/participants/shuffle`, `PUT …/check-in`, `DELETE …/participants/{id}`, `DELETE /tournaments/{id}`, `DELETE …/result`, `DELETE …/help` and `GET …/messages`. They're thin, but the PATCH merge and the requirements route have logic of their own. A db spec that calls a few exported handlers with a fake event (the pattern `handler.db.spec.ts` already has) would cover them.

</details>

<details>
<summary>File map</summary>

- `src/lib/server/services/errors.ts`: `ServiceErrorKind` and the `kind` field.
- `src/lib/server/services/matches.ts`: shared `report()`, `reportForParticipant`, `sideOf` by user or participant, reclassified throws.
- `src/lib/server/services/chat.ts`: key-authored messages, nullable `author`, `apiKey` label, left join.
- `src/lib/server/services/participants.ts`: `getParticipantById`, `addParticipant` returns the id, not-found on remove/check-in, `setSeeds`.
- `src/lib/server/services/tournaments.ts`: `deleteDraftTournament`, `invalid` for theme and structure parse.
- `src/lib/server/services/requirements.ts`: `parseModuleConfig` extracted, `parseRequirements`.
- `src/lib/server/services/apiKeys.ts`: `verifyApiKey` returns the name, 60 s `lastUsedAt` throttle.
- `src/lib/server/db/schema.ts`, `drizzle/0004_api_key_messages.sql`, `drizzle/meta/0004_snapshot.json`, `drizzle/meta/_journal.json`: nullable `author_id`, `api_key_name` (generated).
- `src/lib/server/auth/apiKey.ts` (+ `.db.spec.ts`): `requireApiKey`, `requireApiTournament`.
- `src/lib/server/api/errors.ts` (+ spec): codes, `errorSchema`, `apiError`, `errorResponse`.
- `src/lib/server/api/openapi.ts`: `Endpoint`, `defineEndpoint`, `TAGS`, `buildOpenApiDocument`.
- `src/lib/server/api/schemas.ts`: the components registry and all request/response/param schemas.
- `src/lib/server/api/responses.ts`: `to*` serializers and `matchDetail`.
- `src/lib/server/api/handler.ts` (+ db spec): `endpoint()`, `methodNotAllowed`.
- `src/lib/server/api/endpoints.ts` (+ `openapi.db.spec.ts`): 29 definitions, `endpoints`, `openApiDocument`.
- `src/lib/server/api/reference.ts` (+ spec): docs view model and `typeLabel`.
- `src/routes/api/v1/**/+server.ts`: 21 endpoint routes, `openapi.json`, `[...path]` catch-all.
- `src/routes/docs/api/+page.server.ts`, `+page.svelte`: the reference page.
- `src/lib/components/MatchChat.svelte`, `src/routes/t/[org]/[tournament]/matches/[id]/+page.svelte`: key label and badge, "set through the API" result line.
- `src/routes/+layout.svelte`, `src/routes/o/[org]/admin/api-keys/+page.svelte`: footer and API keys tab links to the docs.
- `messages/en.json`: 30 new keys.
- `src/lib/server/services/{matches,tournaments}.db.spec.ts`, `requirements.spec.ts`: service tests.
- `e2e/helpers.ts`, `e2e/api.e2e.ts`: `createApiKey` helper and the two API e2e tests.
- `docs/PLAN.md`, `README.md`: M7 ✅, Stack line, tree, data model, M7 notes, REST API section.

Full diff: `git diff HEAD` plus the untracked files outside `.agents/` in `git status`.

</details>
