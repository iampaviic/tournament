import * as api from '#lib/server/api/endpoints.ts';
import { endpoint, methodNotAllowed } from '#lib/server/api/handler.ts';
import { steamApps } from '#lib/server/services/steam.ts';

export const GET = endpoint(api.searchSteamApps, async ({ query }) => steamApps.search(query.q));

export const fallback = methodNotAllowed;
