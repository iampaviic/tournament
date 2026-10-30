import { apiError } from '#lib/server/api/errors.ts';
import type { RequestHandler } from './$types';

/** Unknown API routes answer with the error envelope, not the HTML error page. */
export const fallback: RequestHandler = () => apiError(404, 'There is no such endpoint.');
