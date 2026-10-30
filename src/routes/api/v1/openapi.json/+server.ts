import { json } from '@sveltejs/kit';
import { openApiDocument } from '#lib/server/api/endpoints.ts';
import { methodNotAllowed } from '#lib/server/api/handler.ts';
import type { RequestHandler } from './$types';

/** The OpenAPI document. Public, so tools can fetch it without a key. */
export const GET: RequestHandler = () => json(openApiDocument);

export const fallback = methodNotAllowed;
