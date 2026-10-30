import { invalidateAll } from '$app/navigation';

/**
 * Listens to a server-sent events endpoint and calls `events[name]` with the parsed data of each
 * event of that name. Every time the connection opens (the first time and after each reconnect)
 * the page data is reloaded, so changes made after the page was rendered or while disconnected
 * aren't missed. `onstatus` is told whether the connection is up. A connection the browser gave up
 * on is opened again after 3 seconds. Returns a function that closes it.
 */
export function listen(
	url: string,
	events: Record<string, (data: unknown) => void>,
	onstatus?: (connected: boolean) => void
) {
	let source: EventSource;
	let retry: ReturnType<typeof setTimeout> | undefined;
	const connect = () => {
		const current = new EventSource(url);
		source = current;
		current.addEventListener('open', () => {
			onstatus?.(true);
			invalidateAll();
		});
		current.addEventListener('error', () => {
			onstatus?.(false);
			// EventSource only retries after network errors; an HTTP error (such as a 502 while the
			// app restarts) closes it for good. 3000 ms is the `retry` the server sends.
			if (current.readyState === EventSource.CLOSED) retry = setTimeout(connect, 3000);
		});
		for (const [name, handler] of Object.entries(events)) {
			current.addEventListener(name, (event) => handler(JSON.parse(event.data)));
		}
	};
	connect();
	return () => {
		clearTimeout(retry);
		source.close();
	};
}
