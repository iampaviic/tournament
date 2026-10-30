import { error, json, type RequestEvent, type RequestHandler } from '@sveltejs/kit';
import type { z } from 'zod';
import { requireApiKey, type ApiKeyAccess } from '#lib/server/auth/apiKey.ts';
import { apiError, errorResponse } from './errors';
import type { Endpoint } from './openapi';

type Input<E, K extends 'params' | 'query' | 'body'> = E extends {
	[P in K]: infer S extends z.ZodType;
}
	? z.output<S>
	: undefined;
type Result<E extends Endpoint> = E['response'] extends { schema: infer S extends z.ZodType }
	? z.input<S>
	: void;

/** What an endpoint's handler gets: the request, the key it was made with and the valid input. */
export interface ApiContext<E extends Endpoint> {
	event: RequestEvent;
	key: ApiKeyAccess;
	params: Input<E, 'params'>;
	query: Input<E, 'query'>;
	body: Input<E, 'body'>;
}

async function readJson(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		error(400, 'The request body must be JSON.');
	}
}

/**
 * Wraps an endpoint's handler: checks the API key, validates the request with the definition's
 * schemas and answers errors with the envelope.
 */
export function endpoint<E extends Endpoint>(
	definition: E,
	run: (context: ApiContext<E>) => Promise<Result<E>>
) {
	const handler = async (event: RequestEvent) => {
		try {
			const key = await requireApiKey(event);
			const params = definition.params?.safeParse(event.params);
			// An id that can't exist (e.g. not a uuid) is not found.
			if (params && !params.success) error(404, params.error.issues[0].message);
			const query = definition.query?.parse(Object.fromEntries(event.url.searchParams));
			const body = definition.body
				? definition.body.parse(await readJson(event.request))
				: undefined;
			const result = await run({ event, key, params: params?.data, query, body } as ApiContext<E>);
			return 'schema' in definition.response
				? json(result, { status: definition.response.status })
				: new Response(null, { status: 204 });
		} catch (e) {
			return errorResponse(e);
		}
	};
	return Object.assign(handler satisfies RequestHandler, { endpoint: definition });
}

/** The `fallback` of every API route, for methods it doesn't have. */
export const methodNotAllowed: RequestHandler = () =>
	apiError(405, 'This method is not allowed here.');
