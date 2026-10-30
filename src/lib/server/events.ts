/**
 * Live updates, one channel per tournament. Services publish after their transaction commits, and
 * the SSE endpoints forward what their page needs. This only reaches listeners in the same process;
 * running several would need something like Postgres LISTEN/NOTIFY instead.
 */
import type { ChatMessage } from './services/chat';

/** `matches` lists the matches that changed; the list is empty when a stage starts. */
export type TournamentEvent =
	{ type: 'chat'; matchId: string; message: ChatMessage } | { type: 'matches'; matchIds: string[] };

type Listener = (event: TournamentEvent) => void;

const channels = new Map<string, Set<Listener>>();

/** Calls `listener` with the tournament's events until the returned function is called. */
export function subscribe(tournamentId: string, listener: Listener) {
	let listeners = channels.get(tournamentId);
	if (!listeners) channels.set(tournamentId, (listeners = new Set()));
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
		if (!listeners.size && channels.get(tournamentId) === listeners) channels.delete(tournamentId);
	};
}

export function publish(tournamentId: string, event: TournamentEvent) {
	for (const listener of channels.get(tournamentId) ?? []) listener(event);
}

const encoder = new TextEncoder();
/** Comments keep idle connections from being closed by proxies. */
const PING_INTERVAL = 25_000;

/**
 * A server-sent events response with the tournament's events. `pick` turns an event into a named
 * SSE event, or `null` to skip it. The stream ends when the client disconnects.
 */
export function eventStream(
	tournamentId: string,
	signal: AbortSignal,
	pick: (event: TournamentEvent) => { event: string; data: unknown } | null
) {
	let stopped = false;
	let stop = () => {};
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const send = (chunk: string) => {
				if (stopped) return;
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					stop();
				}
			};
			const unsubscribe = subscribe(tournamentId, (event) => {
				const picked = pick(event);
				if (picked) send(`event: ${picked.event}\ndata: ${JSON.stringify(picked.data)}\n\n`);
			});
			const ping = setInterval(() => send(': ping\n\n'), PING_INTERVAL);
			stop = () => {
				if (stopped) return;
				stopped = true;
				unsubscribe();
				clearInterval(ping);
				signal.removeEventListener('abort', stop);
				try {
					controller.close();
				} catch {
					// Already closed or cancelled.
				}
			};
			signal.addEventListener('abort', stop);
			send('retry: 3000\n\n');
			if (signal.aborted) stop();
		},
		cancel() {
			stop();
		}
	});
	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			'x-accel-buffering': 'no'
		}
	});
}
