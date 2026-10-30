import { z } from 'zod';
import { buildOpenApiDocument, defineEndpoint } from './openapi';
import {
	addParticipantBody,
	checkInBody,
	components,
	createTournamentBody,
	matchDetailResource,
	matchParams,
	matchQuery,
	matchResource,
	messageBody,
	messageResource,
	participantParams,
	participantResource,
	reportBody,
	reportOutcomeResource,
	requirementResource,
	requirementsBody,
	resultBody,
	seedsBody,
	stageResource,
	structureBody,
	themeBody,
	tournamentParams,
	tournamentResource,
	tournamentSummaryResource,
	updateTournamentBody
} from './schemas';

/**
 * The REST API's operations, named by operationId. The routes under `/api/v1` validate with these
 * definitions (see `endpoint`), and the OpenAPI document is built from them.
 */

const tournament = {
	status: 200,
	description: 'The tournament.',
	schema: tournamentResource
} as const;
const participants = {
	status: 200,
	description: 'The participants, in seed order.',
	schema: z.array(participantResource)
} as const;
const match = { status: 200, description: 'The match.', schema: matchDetailResource } as const;

// Tournaments

export const listTournaments = defineEndpoint({
	operationId: 'listTournaments',
	method: 'GET',
	path: '/tournaments',
	tag: 'Tournaments',
	summary: "List the organization's tournaments",
	description: 'Newest first, drafts included.',
	response: {
		status: 200,
		description: 'The tournaments.',
		schema: z.array(tournamentSummaryResource)
	}
});

export const createTournament = defineEndpoint({
	operationId: 'createTournament',
	method: 'POST',
	path: '/tournaments',
	tag: 'Tournaments',
	summary: 'Create a tournament',
	description:
		'It starts as a draft, played as a single elimination bracket until you set its stages.',
	body: createTournamentBody,
	response: { status: 201, description: 'The new tournament.', schema: tournamentResource },
	conflicts: [409]
});

export const getTournament = defineEndpoint({
	operationId: 'getTournament',
	method: 'GET',
	path: '/tournaments/{tournamentId}',
	tag: 'Tournaments',
	summary: 'Get a tournament',
	params: tournamentParams,
	response: tournament
});

export const updateTournament = defineEndpoint({
	operationId: 'updateTournament',
	method: 'PATCH',
	path: '/tournaments/{tournamentId}',
	tag: 'Tournaments',
	summary: "Change a tournament's settings",
	description: 'Fields left out keep their value. The address must be free in the organization.',
	params: tournamentParams,
	body: updateTournamentBody,
	response: tournament,
	conflicts: [409]
});

export const deleteTournament = defineEndpoint({
	operationId: 'deleteTournament',
	method: 'DELETE',
	path: '/tournaments/{tournamentId}',
	tag: 'Tournaments',
	summary: 'Delete a draft tournament',
	description:
		'Only drafts can be deleted here. Published tournaments are deleted from the admin page, which asks for their address to confirm.',
	params: tournamentParams,
	response: { status: 204, description: 'Deleted.' },
	conflicts: [409]
});

export const setTheme = defineEndpoint({
	operationId: 'setTheme',
	method: 'PUT',
	path: '/tournaments/{tournamentId}/theme',
	tag: 'Tournaments',
	summary: 'Pick the bracket theme',
	description: 'It can change at any time, even while the tournament is played.',
	params: tournamentParams,
	body: themeBody,
	response: tournament,
	conflicts: [422]
});

export const getRequirements = defineEndpoint({
	operationId: 'getRequirements',
	method: 'GET',
	path: '/tournaments/{tournamentId}/requirements',
	tag: 'Tournaments',
	summary: 'List the requirements',
	description: 'The auth modules participants must have linked to sign up.',
	params: tournamentParams,
	response: {
		status: 200,
		description: 'The requirements.',
		schema: z.array(requirementResource)
	}
});

export const setRequirements = defineEndpoint({
	operationId: 'setRequirements',
	method: 'PUT',
	path: '/tournaments/{tournamentId}/requirements',
	tag: 'Tournaments',
	summary: 'Replace the requirements',
	description:
		'Only enabled auth modules, each once, with valid options. Only before the tournament starts.',
	params: tournamentParams,
	body: requirementsBody,
	response: {
		status: 200,
		description: 'The requirements.',
		schema: z.array(requirementResource)
	},
	conflicts: [409, 422]
});

// Lifecycle

export const openRegistration = defineEndpoint({
	operationId: 'openRegistration',
	method: 'POST',
	path: '/tournaments/{tournamentId}/open-registration',
	tag: 'Lifecycle',
	summary: 'Open registration',
	description:
		'Publishes a draft so participants can sign up, or reopens sign-ups during check-in.',
	params: tournamentParams,
	response: tournament,
	conflicts: [409]
});

export const openCheckIn = defineEndpoint({
	operationId: 'openCheckIn',
	method: 'POST',
	path: '/tournaments/{tournamentId}/open-check-in',
	tag: 'Lifecycle',
	summary: 'Open check-in',
	description:
		'Closes sign-ups. Registered participants then confirm they will play; only those who checked in play.',
	params: tournamentParams,
	response: tournament,
	conflicts: [409]
});

export const unpublishTournament = defineEndpoint({
	operationId: 'unpublishTournament',
	method: 'POST',
	path: '/tournaments/{tournamentId}/unpublish',
	tag: 'Lifecycle',
	summary: 'Turn a tournament back into a draft',
	description: 'Only during registration, while nobody has signed up.',
	params: tournamentParams,
	response: tournament,
	conflicts: [409]
});

export const startTournament = defineEndpoint({
	operationId: 'startTournament',
	method: 'POST',
	path: '/tournaments/{tournamentId}/start',
	tag: 'Lifecycle',
	summary: 'Start the tournament',
	description:
		"Starts the first stage. After a check-in, participants who didn't check in are left out.",
	params: tournamentParams,
	response: tournament,
	conflicts: [409]
});

export const startNextStage = defineEndpoint({
	operationId: 'startNextStage',
	method: 'POST',
	path: '/tournaments/{tournamentId}/start-next-stage',
	tag: 'Lifecycle',
	summary: 'Start the final stage',
	description:
		'Once every match of the group stage is done, starts the final stage with the participants advancing from it.',
	params: tournamentParams,
	response: tournament,
	conflicts: [409]
});

// Stages

export const listStages = defineEndpoint({
	operationId: 'listStages',
	method: 'GET',
	path: '/tournaments/{tournamentId}/stages',
	tag: 'Stages',
	summary: 'List the stages',
	params: tournamentParams,
	response: {
		status: 200,
		description: 'The stages, in play order.',
		schema: z.array(stageResource)
	}
});

export const setStages = defineEndpoint({
	operationId: 'setStages',
	method: 'PUT',
	path: '/tournaments/{tournamentId}/stages',
	tag: 'Stages',
	summary: 'Replace the stages',
	description:
		'The same rules as the structure editor of the admin. Locked once the tournament has started.',
	params: tournamentParams,
	body: structureBody,
	response: {
		status: 200,
		description: 'The stages, in play order.',
		schema: z.array(stageResource)
	},
	conflicts: [409]
});

// Participants

export const listParticipants = defineEndpoint({
	operationId: 'listParticipants',
	method: 'GET',
	path: '/tournaments/{tournamentId}/participants',
	tag: 'Participants',
	summary: 'List the participants',
	params: tournamentParams,
	response: participants
});

export const addParticipant = defineEndpoint({
	operationId: 'addParticipant',
	method: 'POST',
	path: '/tournaments/{tournamentId}/participants',
	tag: 'Participants',
	summary: 'Add a user as a participant',
	description:
		'Like the Participants tab of the admin, it skips the requirements and the participant limit; `requirements` shows how the user measures up. Only before the tournament starts.',
	params: tournamentParams,
	body: addParticipantBody,
	response: { status: 201, description: 'The new participant.', schema: participantResource },
	conflicts: [409, 422]
});

export const setSeeds = defineEndpoint({
	operationId: 'setSeeds',
	method: 'PUT',
	path: '/tournaments/{tournamentId}/participants/seeds',
	tag: 'Participants',
	summary: 'Seed the participants',
	description: 'Lists every participant once, from the first seed to the last.',
	params: tournamentParams,
	body: seedsBody,
	response: participants,
	conflicts: [409, 422]
});

export const shuffleSeeds = defineEndpoint({
	operationId: 'shuffleSeeds',
	method: 'POST',
	path: '/tournaments/{tournamentId}/participants/shuffle',
	tag: 'Participants',
	summary: 'Seed the participants at random',
	params: tournamentParams,
	response: participants,
	conflicts: [409]
});

export const removeParticipant = defineEndpoint({
	operationId: 'removeParticipant',
	method: 'DELETE',
	path: '/tournaments/{tournamentId}/participants/{participantId}',
	tag: 'Participants',
	summary: 'Remove a participant',
	description: 'Only before the tournament starts.',
	params: participantParams,
	response: { status: 204, description: 'Removed.' },
	conflicts: [409]
});

export const setCheckIn = defineEndpoint({
	operationId: 'setCheckIn',
	method: 'PUT',
	path: '/tournaments/{tournamentId}/participants/{participantId}/check-in',
	tag: 'Participants',
	summary: 'Check a participant in or out',
	description: 'For them, as an organizer. Only before the tournament starts.',
	params: participantParams,
	body: checkInBody,
	response: { status: 200, description: 'The participant.', schema: participantResource },
	conflicts: [409]
});

// Matches

export const listMatches = defineEndpoint({
	operationId: 'listMatches',
	method: 'GET',
	path: '/tournaments/{tournamentId}/matches',
	tag: 'Matches',
	summary: 'List the matches',
	description: 'By stage, group and number. Byes are left out, and `status` is what players see.',
	params: tournamentParams,
	query: matchQuery,
	response: { status: 200, description: 'The matches.', schema: z.array(matchResource) }
});

export const getMatch = defineEndpoint({
	operationId: 'getMatch',
	method: 'GET',
	path: '/tournaments/{tournamentId}/matches/{matchId}',
	tag: 'Matches',
	summary: 'Get a match',
	params: matchParams,
	response: match
});

export const setMatchResult = defineEndpoint({
	operationId: 'setMatchResult',
	method: 'PUT',
	path: '/tournaments/{tournamentId}/matches/{matchId}/result',
	tag: 'Matches',
	summary: 'Set the result',
	description:
		"Sets or corrects the result as an organizer, while the stage is played. It replaces the players' reports, clears disputes and help requests, and is stored as decided by the API key.",
	params: matchParams,
	body: resultBody,
	response: match,
	conflicts: [409, 422]
});

export const clearMatchResult = defineEndpoint({
	operationId: 'clearMatchResult',
	method: 'DELETE',
	path: '/tournaments/{tournamentId}/matches/{matchId}/result',
	tag: 'Matches',
	summary: 'Clear the result',
	description: "Removes the result and the players' reports, while the stage is played.",
	params: matchParams,
	response: match,
	conflicts: [409]
});

export const reportMatch = defineEndpoint({
	operationId: 'reportMatch',
	method: 'POST',
	path: '/tournaments/{tournamentId}/matches/{matchId}/reports',
	tag: 'Matches',
	summary: 'Report the scores for a player',
	description:
		'For bots that report for one of the players. Matching reports from both players decide the match; different ones dispute it until an organizer sets the result.',
	params: matchParams,
	body: reportBody,
	response: { status: 200, description: 'What the report did.', schema: reportOutcomeResource },
	conflicts: [409, 422]
});

export const clearHelp = defineEndpoint({
	operationId: 'clearHelp',
	method: 'DELETE',
	path: '/tournaments/{tournamentId}/matches/{matchId}/help',
	tag: 'Matches',
	summary: 'Mark a help request as handled',
	params: matchParams,
	response: match
});

// Messages

export const listMessages = defineEndpoint({
	operationId: 'listMessages',
	method: 'GET',
	path: '/tournaments/{tournamentId}/matches/{matchId}/messages',
	tag: 'Messages',
	summary: "List a match room's messages",
	description: 'Oldest first.',
	params: matchParams,
	response: { status: 200, description: 'The messages.', schema: z.array(messageResource) }
});

export const postMessage = defineEndpoint({
	operationId: 'postMessage',
	method: 'POST',
	path: '/tournaments/{tournamentId}/matches/{matchId}/messages',
	tag: 'Messages',
	summary: 'Write in a match room',
	description: "It shows as an organizer message, labelled with the API key's name.",
	params: matchParams,
	body: messageBody,
	response: { status: 201, description: 'The message.', schema: messageResource }
});

/** Every REST endpoint, in documentation order. */
export const endpoints = [
	listTournaments,
	createTournament,
	getTournament,
	updateTournament,
	deleteTournament,
	setTheme,
	getRequirements,
	setRequirements,
	openRegistration,
	openCheckIn,
	unpublishTournament,
	startTournament,
	startNextStage,
	listStages,
	setStages,
	listParticipants,
	addParticipant,
	setSeeds,
	shuffleSeeds,
	removeParticipant,
	setCheckIn,
	listMatches,
	getMatch,
	setMatchResult,
	clearMatchResult,
	reportMatch,
	clearHelp,
	listMessages,
	postMessage
] as const;

/** The OpenAPI document, built from the same definitions the routes validate with. */
export const openApiDocument = buildOpenApiDocument(endpoints, components);
