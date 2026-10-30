import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { handleError } from './hooks.server';

const event = {} as RequestEvent;

describe('handleError', () => {
	afterEach(() => vi.restoreAllMocks());

	it('keeps the message of errors thrown with error()', () => {
		expect(
			handleError({ kind: 'app', error: { status: 403, message: 'Not yours.' }, event })
		).toBeUndefined();
	});

	it("translates SvelteKit's own errors", () => {
		const framework = (status: number) =>
			handleError({ kind: 'framework', error: { status, message: 'Not Found' }, event });
		expect(framework(404)).toEqual({ message: 'Page not found' });
		expect(framework(405)).toEqual({ message: 'Something went wrong' });
	});

	it('logs unexpected errors and answers with a translated message', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const error = new Error('boom');
		expect(handleError({ kind: 'unknown', error, event })).toEqual({
			message: 'Something went wrong'
		});
		expect(log).toHaveBeenCalledWith(error);
	});
});
