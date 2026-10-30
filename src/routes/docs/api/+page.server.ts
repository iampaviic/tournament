import { ERROR_CODES } from '#lib/server/api/errors.ts';
import { openApiDocument } from '#lib/server/api/endpoints.ts';
import { apiReference } from '#lib/server/api/reference.ts';
import type { PageServerLoad } from './$types';

/** The REST API reference, built from the OpenAPI document. Public, like the document. */
export const load: PageServerLoad = () => ({
	reference: apiReference(openApiDocument),
	errors: Object.entries(ERROR_CODES).map(([status, code]) => ({ status: Number(status), code }))
});
