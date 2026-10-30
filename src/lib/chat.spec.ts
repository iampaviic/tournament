import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '#lib/server/services/chat.ts';
import { mergeMessages } from './chat';

const message = (id: string, seconds: number, body = id): ChatMessage => ({
	id,
	body,
	createdAt: new Date(Date.UTC(2030, 4, 1, 18, 0, seconds)),
	asOrganizer: false,
	author: null,
	apiKey: null
});

describe('mergeMessages', () => {
	it('keeps each message once', () => {
		const merged = mergeMessages([message('a', 1), message('b', 2)], [message('b', 2)]);
		expect(merged.map((m) => m.id)).toEqual(['a', 'b']);
	});

	it('sorts by time, then id', () => {
		const merged = mergeMessages(
			[message('c', 3), message('b', 1)],
			[message('d', 2), message('a', 1)]
		);
		expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'd', 'c']);
	});

	it('keeps a received message a later reload is missing', () => {
		const received = [message('b', 2)];
		const reloaded = [message('a', 1), message('c', 3)];
		expect(mergeMessages(reloaded, received).map((m) => m.id)).toEqual(['a', 'b', 'c']);
	});

	it('returns the loaded messages when nothing was received', () => {
		const loaded = [message('a', 1, 'hello')];
		expect(mergeMessages(loaded, [])).toEqual(loaded);
	});
});
