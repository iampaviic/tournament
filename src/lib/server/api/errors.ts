import { isHttpError, json } from '@sveltejs/kit';
import { z } from 'zod';
import { ServiceError, type ServiceErrorKind } from '#lib/server/services/errors.ts';

/** The `code` of every status the REST API answers errors with. */
export const ERROR_CODES = {
	400: 'invalid_request',
	401: 'unauthorized',
	404: 'not_found',
	405: 'method_not_allowed',
	409: 'conflict',
	422: 'unprocessable',
	500: 'internal_error'
} as const;
type ErrorStatus = keyof typeof ERROR_CODES;

export const errorSchema = z
	.object({
		error: z.object({
			code: z.enum(Object.values(ERROR_CODES)).describe('One per HTTP status, e.g. `not_found`.'),
			message: z.string().describe('What went wrong, in English.'),
			issues: z
				.array(
					z.object({
						path: z.array(z.union([z.string(), z.number()])),
						message: z.string()
					})
				)
				.optional()
				.describe('What is wrong with each part of the request.')
		})
	})
	.describe('Every error has this shape.');
type Issue = { path: (string | number)[]; message: string };

/** How each kind of service rule violation is answered. */
const SERVICE_STATUS: Record<ServiceErrorKind, ErrorStatus> = {
	conflict: 409,
	invalid: 422,
	not_found: 404
};

/** An error in the envelope. Statuses without a code of their own become 400 or 500. */
export function apiError(status: number, message: string, issues?: Issue[]) {
	const known: ErrorStatus =
		status in ERROR_CODES ? (status as ErrorStatus) : status < 500 ? 400 : 500;
	const body: z.input<typeof errorSchema> = {
		error: { code: ERROR_CODES[known], message, ...(issues && { issues }) }
	};
	return json(body, {
		status: known,
		headers: known === 401 ? { 'www-authenticate': 'Bearer' } : undefined
	});
}

/**
 * Answers a failed request: invalid input with 400, guard errors with their status, rule
 * violations by their kind (see `ServiceErrorKind`) and anything else, a bug, with 500.
 */
export function errorResponse(e: unknown) {
	if (e instanceof z.ZodError) {
		return apiError(
			400,
			e.issues[0].message,
			e.issues.map((issue) => ({
				path: issue.path.map((part) => (typeof part === 'symbol' ? String(part) : part)),
				message: issue.message
			}))
		);
	}
	if (e instanceof ServiceError) return apiError(SERVICE_STATUS[e.kind], e.message);
	if (isHttpError(e)) return apiError(e.status, e.body.message);
	console.error(e);
	return apiError(500, 'Something went wrong.');
}
