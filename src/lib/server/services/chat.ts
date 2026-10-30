import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { matchMessages, matches, stages, users, type Tournament } from '#lib/server/db/schema.ts';
import { publish } from '#lib/server/events.ts';
import { m } from '#lib/paraglide/messages.js';
import { ServiceError } from './errors';
import { getParticipant } from './participants';

export const messageSchema = z
	.string({ error: () => m.chat_error_empty() })
	.trim()
	.min(1, { error: () => m.chat_error_empty() })
	.max(1000, { error: () => m.chat_error_too_long({ max: 1000 }) });

/** A message in a match room's chat. */
export interface ChatMessage {
	id: string;
	body: string;
	createdAt: Date;
	/** Written by an organizer who isn't playing the match. */
	asOrganizer: boolean;
	/** The user who wrote it; `null` when an API key did. */
	author: { username: string; displayName: string; avatarUrl: string | null } | null;
	/** The name of the API key that wrote it. */
	apiKey: string | null;
}

const authorColumns = {
	username: users.username,
	displayName: users.displayName,
	avatarUrl: users.avatarUrl
};

/** A match's chat, oldest first. */
export async function listMessages(matchId: string): Promise<ChatMessage[]> {
	return db
		.select({
			id: matchMessages.id,
			body: matchMessages.body,
			createdAt: matchMessages.createdAt,
			asOrganizer: matchMessages.asOrganizer,
			author: authorColumns,
			apiKey: matchMessages.apiKeyName
		})
		.from(matchMessages)
		.leftJoin(users, eq(matchMessages.authorId, users.id))
		.where(eq(matchMessages.matchId, matchId))
		.orderBy(asc(matchMessages.createdAt), asc(matchMessages.id));
}

/**
 * Writes in a match's chat. The match's players can write, and so can organizers (members with a
 * trusted session, decided by the caller); organizers who aren't playing are marked as such.
 * API keys write as organizers, labelled with the key's name.
 */
export async function postMessage(
	tournament: Tournament,
	matchId: string,
	author: { userId: string; organizer: boolean } | { apiKeyName: string },
	body: string
): Promise<ChatMessage> {
	const [match] = await db
		.select({ participant1Id: matches.participant1Id, participant2Id: matches.participant2Id })
		.from(matches)
		.innerJoin(stages, eq(matches.stageId, stages.id))
		.where(and(eq(matches.id, matchId), eq(stages.tournamentId, tournament.id)));
	if (!match) throw new ServiceError(m.match_error_not_found(), 'not_found');

	if ('apiKeyName' in author) {
		const [row] = await db
			.insert(matchMessages)
			.values({ matchId, authorId: null, apiKeyName: author.apiKeyName, asOrganizer: true, body })
			.returning();
		const message: ChatMessage = {
			id: row.id,
			body: row.body,
			createdAt: row.createdAt,
			asOrganizer: row.asOrganizer,
			author: null,
			apiKey: author.apiKeyName
		};
		publish(tournament.id, { type: 'chat', matchId, message });
		return message;
	}

	const participant = await getParticipant(tournament.id, author.userId);
	const isPlayer =
		!!participant &&
		(participant.id === match.participant1Id || participant.id === match.participant2Id);
	if (!isPlayer && !author.organizer) {
		throw new ServiceError(m.chat_error_not_allowed());
	}

	const [row] = await db
		.insert(matchMessages)
		.values({ matchId, authorId: author.userId, asOrganizer: author.organizer && !isPlayer, body })
		.returning();
	const [user] = await db.select(authorColumns).from(users).where(eq(users.id, author.userId));
	const message: ChatMessage = {
		id: row.id,
		body: row.body,
		createdAt: row.createdAt,
		asOrganizer: row.asOrganizer,
		author: user,
		apiKey: null
	};
	publish(tournament.id, { type: 'chat', matchId, message });
	return message;
}
