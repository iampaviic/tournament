import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invalidateAll } from '$app/navigation';
import { listen } from './live';

vi.mock('$app/navigation', () => ({ invalidateAll: vi.fn() }));

/** Enough of `EventSource` for `listen`: tests fire its events by hand. */
class FakeEventSource {
	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSED = 2;
	static instances: FakeEventSource[] = [];

	readyState = FakeEventSource.CONNECTING;
	closed = false;
	private listeners: Record<string, ((event: MessageEvent) => void)[]> = {};

	constructor(public url: string) {
		FakeEventSource.instances.push(this);
	}

	addEventListener(name: string, listener: (event: MessageEvent) => void) {
		(this.listeners[name] ??= []).push(listener);
	}

	dispatch(name: string, data?: unknown) {
		const event = new MessageEvent(name, { data: JSON.stringify(data) });
		for (const listener of this.listeners[name] ?? []) listener(event);
	}

	close() {
		this.closed = true;
		this.readyState = FakeEventSource.CLOSED;
	}
}

beforeEach(() => {
	FakeEventSource.instances = [];
	vi.stubGlobal('EventSource', FakeEventSource);
	vi.useFakeTimers();
	vi.mocked(invalidateAll).mockClear();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('listen', () => {
	it('reports the connection and reloads the page data when it opens', () => {
		const onstatus = vi.fn();
		listen('/events', {}, onstatus);
		const [source] = FakeEventSource.instances;
		expect(source.url).toBe('/events');
		source.readyState = FakeEventSource.OPEN;
		source.dispatch('open');
		expect(onstatus).toHaveBeenLastCalledWith(true);
		expect(invalidateAll).toHaveBeenCalledOnce();
	});

	it('passes the parsed data of named events', () => {
		const chat = vi.fn();
		listen('/events', { chat });
		FakeEventSource.instances[0].dispatch('chat', { id: 'a' });
		expect(chat).toHaveBeenCalledWith({ id: 'a' });
	});

	it('leaves reconnecting to the browser while it is still trying', () => {
		const onstatus = vi.fn();
		listen('/events', {}, onstatus);
		FakeEventSource.instances[0].dispatch('error');
		expect(onstatus).toHaveBeenLastCalledWith(false);
		vi.advanceTimersByTime(3000);
		expect(FakeEventSource.instances).toHaveLength(1);
	});

	it('opens a new connection 3 seconds after the browser gave up', () => {
		const onstatus = vi.fn();
		listen('/events', {}, onstatus);
		const [first] = FakeEventSource.instances;
		first.readyState = FakeEventSource.CLOSED;
		first.dispatch('error');
		expect(onstatus).toHaveBeenLastCalledWith(false);
		vi.advanceTimersByTime(2999);
		expect(FakeEventSource.instances).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(FakeEventSource.instances).toHaveLength(2);

		const second = FakeEventSource.instances[1];
		second.readyState = FakeEventSource.OPEN;
		second.dispatch('open');
		expect(onstatus).toHaveBeenLastCalledWith(true);
		expect(invalidateAll).toHaveBeenCalledOnce();
	});

	it('closes the current connection when stopped', () => {
		const stop = listen('/events', {});
		const [first] = FakeEventSource.instances;
		first.readyState = FakeEventSource.CLOSED;
		first.dispatch('error');
		vi.advanceTimersByTime(3000);
		stop();
		expect(FakeEventSource.instances[1].closed).toBe(true);
	});

	it('cancels a pending reconnect when stopped', () => {
		const stop = listen('/events', {});
		const [first] = FakeEventSource.instances;
		first.readyState = FakeEventSource.CLOSED;
		first.dispatch('error');
		stop();
		vi.advanceTimersByTime(3000);
		expect(FakeEventSource.instances).toHaveLength(1);
	});
});
