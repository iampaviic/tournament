import { afterEach, describe, expect, it, vi } from 'vitest';
import { eventStream, publish, subscribe, type TournamentEvent } from './events';

const changed = (...matchIds: string[]): TournamentEvent => ({ type: 'matches', matchIds });

describe('subscribe', () => {
	it('delivers events of the tournament only, until unsubscribed', () => {
		const a = vi.fn();
		const b = vi.fn();
		const unsubscribe = subscribe('a', a);
		subscribe('b', b);

		publish('a', changed('m1'));
		expect(a).toHaveBeenCalledWith(changed('m1'));
		expect(b).not.toHaveBeenCalled();

		unsubscribe();
		publish('a', changed('m2'));
		expect(a).toHaveBeenCalledTimes(1);
	});
});

describe('eventStream', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	function open(pick: Parameters<typeof eventStream>[2], signal = new AbortController().signal) {
		const response = eventStream('t', signal, pick);
		const reader = response.body!.getReader();
		const decoder = new TextDecoder();
		const read = async () => {
			const { value, done } = await reader.read();
			return done ? null : decoder.decode(value);
		};
		return { response, reader, read };
	}

	it('sends the picked events after the retry interval', async () => {
		const { response, reader, read } = open((event) =>
			event.type === 'matches' && event.matchIds.includes('m1')
				? { event: 'update', data: event.matchIds }
				: null
		);
		expect(response.headers.get('content-type')).toBe('text/event-stream');
		expect(response.headers.get('cache-control')).toBe('no-cache');
		expect(response.headers.get('x-accel-buffering')).toBe('no');
		expect(await read()).toBe('retry: 3000\n\n');

		publish('t', changed('m2'));
		publish('other', changed('m1'));
		publish('t', changed('m1', 'm2'));
		expect(await read()).toBe('event: update\ndata: ["m1","m2"]\n\n');
		await reader.cancel();
	});

	it('pings every 25 seconds', async () => {
		vi.useFakeTimers();
		const { reader, read } = open(() => null);
		expect(await read()).toBe('retry: 3000\n\n');
		vi.advanceTimersByTime(25_000);
		expect(await read()).toBe(': ping\n\n');
		await reader.cancel();
	});

	it('stops delivering when the client cancels', async () => {
		const pick = vi.fn(() => ({ event: 'update', data: null }));
		const { reader, read } = open(pick);
		await read();
		await reader.cancel();
		publish('t', changed('m1'));
		expect(pick).not.toHaveBeenCalled();
	});

	it('ends when the request is aborted', async () => {
		const controller = new AbortController();
		const pick = vi.fn(() => ({ event: 'update', data: null }));
		const { read } = open(pick, controller.signal);
		expect(await read()).toBe('retry: 3000\n\n');
		controller.abort();
		expect(await read()).toBeNull();
		publish('t', changed('m1'));
		expect(pick).not.toHaveBeenCalled();
	});
});
