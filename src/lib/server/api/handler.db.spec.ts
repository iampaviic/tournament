import { beforeEach, describe, expect, it } from 'vitest';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { createApiKey } from '#lib/server/services/apiKeys.ts';
import { ServiceError } from '#lib/server/services/errors.ts';
import { createOrganization } from '#lib/server/services/organizations.ts';
import { createUser, resetDatabase } from '#lib/server/testing/factories.ts';
import { endpoint, methodNotAllowed } from './handler';
import { defineEndpoint } from './openapi';

const params = z.object({ thingId: z.uuid('Thing not found.') });

const create = endpoint(
	defineEndpoint({
		operationId: 'createThing',
		method: 'POST',
		path: '/things/{thingId}',
		tag: 'Tournaments',
		summary: 'x',
		params,
		query: z.object({ n: z.coerce.number().int().optional() }),
		body: z.object({ name: z.string().min(1, 'Name is required.') }),
		response: { status: 201, description: 'x', schema: z.object({ name: z.string(), n: z.int() }) }
	}),
	async ({ body, query }) => {
		if (body.name === 'conflict') throw new ServiceError('That name is taken.');
		return { name: body.name, n: query.n ?? 0 };
	}
);

const remove = endpoint(
	defineEndpoint({
		operationId: 'deleteThing',
		method: 'DELETE',
		path: '/things/{thingId}',
		tag: 'Tournaments',
		summary: 'x',
		params,
		response: { status: 204, description: 'x' }
	}),
	async () => {}
);

let key: string;
beforeEach(async () => {
	await resetDatabase();
	const owner = await createUser('owner');
	const org = await createOrganization(owner.id, { name: 'Club', slug: 'club', description: '' });
	({ key } = await createApiKey(org.id, 'Bot', owner.id));
});

/** Calls the handler like SvelteKit would, with the key unless `authorization` says otherwise. */
const call = async (
	handler: RequestHandler,
	{
		method = 'POST',
		thingId = crypto.randomUUID(),
		body,
		authorization = `Bearer ${key}`
	}: { method?: string; thingId?: string; body?: string; authorization?: string | null } = {}
) => {
	const url = new URL(`http://localhost/api/v1/things/${thingId}?n=2`);
	const request = new Request(url, {
		method,
		headers: authorization ? { authorization } : {},
		body
	});
	return handler({ request, url, params: { thingId } } as unknown as RequestEvent);
};

describe('endpoint', () => {
	it('requires an API key', async () => {
		const response = await call(create, { authorization: null, body: '{"name":"x"}' });
		expect(response.status).toBe(401);
		expect(response.headers.get('www-authenticate')).toBe('Bearer');
		expect((await response.json()).error.code).toBe('unauthorized');
	});

	it("doesn't find paths with ids that can't exist", async () => {
		const response = await call(create, { thingId: 'nope', body: '{"name":"x"}' });
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			error: { code: 'not_found', message: 'Thing not found.' }
		});
	});

	it('rejects bodies that are not JSON or not valid', async () => {
		const broken = await call(create, { body: '{nope' });
		expect(broken.status).toBe(400);
		expect((await broken.json()).error.message).toBe('The request body must be JSON.');

		const invalid = await call(create, { body: '{"name":""}' });
		expect(invalid.status).toBe(400);
		expect(await invalid.json()).toEqual({
			error: {
				code: 'invalid_request',
				message: 'Name is required.',
				issues: [{ path: ['name'], message: 'Name is required.' }]
			}
		});
	});

	it('answers rule violations with the envelope', async () => {
		const response = await call(create, { body: '{"name":"conflict"}' });
		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: { code: 'conflict', message: 'That name is taken.' }
		});
	});

	it('answers with the status of the definition', async () => {
		const created = await call(create, { body: '{"name":"Cup"}' });
		expect(created.status).toBe(201);
		expect(created.headers.get('content-type')).toBe('application/json');
		expect(await created.json()).toEqual({ name: 'Cup', n: 2 });

		const removed = await call(remove, { method: 'DELETE' });
		expect(removed.status).toBe(204);
		expect(await removed.text()).toBe('');
	});
});

describe('methodNotAllowed', () => {
	it('answers with the envelope', async () => {
		const response = await call(methodNotAllowed, { method: 'PUT' });
		expect(response.status).toBe(405);
		expect((await response.json()).error.code).toBe('method_not_allowed');
	});
});
