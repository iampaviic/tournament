import type { ChatMessage } from '#lib/server/services/chat.ts';

/**
 * The messages loaded with the page plus the ones received live, each once and oldest first (the
 * order of `listMessages`). A reload that ran before a received message was stored doesn't drop it.
 */
export function mergeMessages(loaded: ChatMessage[], received: ChatMessage[]): ChatMessage[] {
	const byId = new Map([...loaded, ...received].map((message) => [message.id, message]));
	return [...byId.values()].toSorted(
		(a, b) =>
			a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
	);
}
