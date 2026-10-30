import { invalidateAll } from '$app/navigation';

/**
 * Listens to a server-sent events endpoint and calls `events[name]` with the parsed data of each
 * event of that name. Every time the connection opens (the first time and after each reconnect)
 * the page data is reloaded, so changes made after the page was rendered or while disconnected
 * aren't missed. `onstatus` is told whether the connection is up. Returns a function that closes it.
 */
export function listen(
	url: string,
	events: Record<string, (data: unknown) => void>,
	onstatus?: (connected: boolean) => void
) {
	const source = new EventSource(url);
	source.addEventListener('open', () => {
		onstatus?.(true);
		invalidateAll();
	});
	source.addEventListener('error', () => onstatus?.(false));
	for (const [name, handler] of Object.entries(events)) {
		source.addEventListener(name, (event) => handler(JSON.parse(event.data)));
	}
	return () => source.close();
}
