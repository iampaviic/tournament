import { describe, expect, it, vi } from 'vitest';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { ServiceError } from '#lib/server/services/errors.ts';
import { errorResponse, errorSchema } from './errors';

const thrown = (run: () => unknown) => {
	try {
		run();
	} catch (e) {
		return e;
	}
	throw new Error('Nothing was thrown.');
};
const answer = async (e: unknown) => {
	const response = errorResponse(e);
	return { response, body: errorSchema.parse(await response.json()).error };
};

describe('errorResponse', () => {
	it('answers invalid input with 400 and every issue', async () => {
		const schema = z.object({
			name: z.string().min(1, 'Name is required.'),
			scores: z.array(z.int('Scores must be whole numbers.'))
		});
		const { response, body } = await answer(schema.safeParse({ name: '', scores: [1, 'x'] }).error);
		expect(response.status).toBe(400);
		expect(body).toEqual({
			code: 'invalid_request',
			message: 'Name is required.',
			issues: [
				{ path: ['name'], message: 'Name is required.' },
				{ path: ['scores', 1], message: 'Scores must be whole numbers.' }
			]
		});
	});

	it.each([
		[new ServiceError('Registration is closed.'), 409, 'conflict'],
		[new ServiceError('That theme is not available.', 'invalid'), 422, 'unprocessable'],
		[new ServiceError('Match not found.', 'not_found'), 404, 'not_found']
	])('answers %s by its kind', async (e, status, code) => {
		const { response, body } = await answer(e);
		expect(response.status).toBe(status);
		expect(body).toEqual({ code, message: e.message });
	});

	it('answers guard errors with their status', async () => {
		const unauthorized = await answer(thrown(() => error(401, 'Send an API key.')));
		expect(unauthorized.response.status).toBe(401);
		expect(unauthorized.response.headers.get('www-authenticate')).toBe('Bearer');
		expect(unauthorized.body).toEqual({ code: 'unauthorized', message: 'Send an API key.' });

		const notFound = await answer(thrown(() => error(404, 'Tournament not found.')));
		expect(notFound.response.status).toBe(404);
		expect(notFound.response.headers.get('www-authenticate')).toBeNull();
		expect(notFound.body).toEqual({ code: 'not_found', message: 'Tournament not found.' });
	});

	it('answers bugs with 500 without showing them', async () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const { response, body } = await answer(new Error('boom'));
		expect(response.status).toBe(500);
		expect(body).toEqual({ code: 'internal_error', message: 'Something went wrong.' });
		expect(log).toHaveBeenCalledOnce();
		log.mockRestore();
	});
});
