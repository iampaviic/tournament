import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '#lib/server/db/index.ts';
import { matchMessages, matches, stages, users, type Tournament } from '#lib/server/db/schema.ts';
import { publish } from '#lib/server/events.ts';
import { ServiceError } from './errors';
import { getParticipant } from './participants';

export const messageSchema = z
	.string('Write a message.')
	.trim()
	.min(1, 'Write a message.')
	.max(1000, 'Messages can be at most 1000 characters.');

/** A message in a match room's chat. */
export interface ChatMessage {
	id: string;
	body: string;
	createdAt: Date;
	/** Written by an organizer who isn't playing the match. */
	asOrganizer: boolean;
	author: { username: string; displayName: string; avatarUrl: string | null };
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
			author: authorColumns
		})
		.from(matchMessages)
		.innerJoin(users, eq(matchMessages.authorId, users.id))
		.where(eq(matchMessages.matchId, matchId))
		.orderBy(asc(matchMessages.createdAt), asc(matchMessages.id));
}

/**
 * Writes in a match's chat. The match's players can write, and so can organizers (members with a
 * trusted session, decided by the caller); organizers who aren't playing are marked as such.
 */
export async function postMessage(
	tournament: Tournament,
	matchId: string,
	author: { userId: string; organizer: boolean },
	body: string
): Promise<ChatMessage> {
	const [match] = await db
		.select({ participant1Id: matches.participant1Id, participant2Id: matches.participant2Id })
		.from(matches)
		.innerJoin(stages, eq(matches.stageId, stages.id))
		.where(and(eq(matches.id, matchId), eq(stages.tournamentId, tournament.id)));
	if (!match) throw new ServiceError('Match not found.');
	const participant = await getParticipant(tournament.id, author.userId);
	const isPlayer =
		!!participant &&
		(participant.id === match.participant1Id || participant.id === match.participant2Id);
	if (!isPlayer && !author.organizer) {
		throw new ServiceError('Only the players of this match and the organizers can write here.');
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
		author: user
	};
	publish(tournament.id, { type: 'chat', matchId, message });
	return message;
}
