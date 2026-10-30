import { z } from 'zod';
import type { MatchProgress } from '#lib/matchReports.ts';
import { stageStatus, stageType, tournamentStatus } from '#lib/server/db/schema.ts';
import { messageSchema } from '#lib/server/services/chat.ts';
import { matchIdSchema } from '#lib/server/services/matches.ts';
import { tournamentSchema } from '#lib/server/services/tournaments.ts';
import { stageConfigSchema, stageSettingsSchema, structureSchema } from '#lib/tournaments.ts';
import { errorSchema } from './errors';

/** Named schemas of the REST API; they become `components.schemas` of the OpenAPI document. */
export const components = z.registry<{ id: string }>();

errorSchema.register(components, { id: 'Error' });
stageSettingsSchema.register(components, { id: 'StageSettings' });
stageConfigSchema.register(components, { id: 'StageConfig' });

// Request bodies. They reuse the services' schemas, so the API checks what the admin pages check.

export const createTournamentBody = tournamentSchema
	.pick({ name: true, slug: true })
	.describe(
		'A new tournament. `slug` is its address, `/t/<organization>/<slug>`. It starts as a draft, played as a single elimination bracket.'
	)
	.register(components, { id: 'TournamentCreate' });

export const updateTournamentBody = tournamentSchema
	.extend({
		startsAt: z.iso
			.datetime({ offset: true })
			.transform((value) => new Date(value))
			.nullable()
			.describe('When it starts, e.g. `2030-05-01T18:00:00Z`, or `null`.')
	})
	.partial()
	.describe(
		'The settings to change; fields left out keep their value. `participantLimit` is `null` for no limit.'
	)
	.register(components, { id: 'TournamentUpdate' });

export const themeBody = z
	.object({ themeId: z.string().describe('A bracket theme of this instance, e.g. `default`.') })
	.describe('The bracket theme.')
	.register(components, { id: 'ThemeUpdate' });

export const requirementResource = z
	.object({
		moduleId: z.string().min(1).describe('The auth module, e.g. `discord`.'),
		config: z
			.record(z.string(), z.unknown())
			.describe("The module's options, e.g. a rank range. `{}` uses its defaults.")
	})
	.describe('An auth module participants must have linked to sign up.')
	.register(components, { id: 'Requirement' });

export const requirementsBody = z
	.object({ requirements: z.array(requirementResource) })
	.describe('Every requirement, each module once. An empty list removes them.')
	.register(components, { id: 'RequirementsUpdate' });

export const structureBody = z
	.object({ stages: structureSchema })
	.describe(
		'One stage, or a group stage and a final stage. The final stage plays as a single group.'
	)
	.register(components, { id: 'StructureUpdate' });

export const addParticipantBody = z
	.object({
		username: z.string().trim().min(1, 'Username is required.').describe('An existing user.')
	})
	.describe('The user to add.')
	.register(components, { id: 'ParticipantAdd' });

export const seedsBody = z
	.object({
		participantIds: z
			.array(z.uuid())
			.describe('Every participant once, from the first seed to the last.')
	})
	.describe('The seed order.')
	.register(components, { id: 'SeedOrder' });

export const checkInBody = z
	.object({ checkedIn: z.boolean() })
	.describe('Whether the participant has checked in.')
	.register(components, { id: 'CheckInUpdate' });

const SCORE_RULE = 'Scores must be whole numbers, zero or more.';
const score = z.int(SCORE_RULE).min(0, SCORE_RULE).max(999_999_999, SCORE_RULE);

export const scoresTuple = z
	.tuple([score, score])
	.describe('Games or points won by each entrant, in entrant order, e.g. `[3, 1]`.')
	.register(components, { id: 'Scores' });

export const resultBody = z
	.object({ scores: scoresTuple })
	.describe("The match's result.")
	.register(components, { id: 'ResultUpdate' });

export const reportBody = z
	.object({
		participantId: z.uuid().describe('The player the report is for.'),
		scores: scoresTuple
	})
	.describe("A player's report.")
	.register(components, { id: 'ReportCreate' });

export const messageBody = z
	.object({ body: messageSchema.describe('At most 1000 characters.') })
	.describe('A chat message.')
	.register(components, { id: 'MessageCreate' });

// Responses. Dates are ISO 8601 strings.

export const tournamentResource = z
	.object({
		id: z.uuid(),
		slug: z.string().describe('The address: `/t/<organization>/<slug>`.'),
		name: z.string(),
		description: z.string(),
		status: z
			.enum(tournamentStatus.enumValues)
			.describe('`draft`, `registration`, `check_in` (optional), `running`, then `completed`.'),
		startsAt: z.iso.datetime().nullable(),
		participantLimit: z.int().nullable().describe('`null` for no limit.'),
		themeId: z.string().describe('The bracket theme.'),
		createdAt: z.iso.datetime()
	})
	.describe('A tournament of the organization.')
	.register(components, { id: 'Tournament' });

export const tournamentSummaryResource = z
	.object({
		id: z.uuid(),
		slug: z.string(),
		name: z.string(),
		status: z.enum(tournamentStatus.enumValues),
		startsAt: z.iso.datetime().nullable(),
		participants: z.int().describe('How many have signed up.')
	})
	.describe('A tournament in a list.')
	.register(components, { id: 'TournamentSummary' });

export const stageResource = z
	.object({
		id: z.uuid(),
		index: z.int().describe('0 for the first stage.'),
		type: z.enum(stageType.enumValues),
		status: z.enum(stageStatus.enumValues),
		settings: stageSettingsSchema,
		groups: z
			.array(
				z.object({
					participantIds: z.array(z.uuid()).describe('In seed order.'),
					standings: z
						.array(z.object({ participantId: z.uuid(), rank: z.int().nullable() }))
						.describe('Best first.')
				})
			)
			.describe('Set when the stage starts. Stages without groups have one.')
	})
	.describe('A stage of the tournament.')
	.register(components, { id: 'Stage' });

export const requirementCheckResource = z
	.object({
		moduleId: z.string(),
		moduleName: z.string(),
		status: z
			.enum(['ok', 'missing', 'ineligible', 'unavailable'])
			.describe(
				'`missing`: no linked account; `unavailable`: the module is no longer enabled here.'
			),
		reason: z.string().optional().describe('Why the user is `ineligible`.')
	})
	.describe('How a participant meets one requirement.')
	.register(components, { id: 'RequirementCheck' });

export const participantResource = z
	.object({
		id: z.uuid(),
		userId: z.uuid(),
		username: z.string(),
		displayName: z.string(),
		seed: z.int().nullable().describe('Unseeded participants follow in sign-up order.'),
		checkedInAt: z.iso.datetime().nullable(),
		finalRank: z.int().nullable().describe('Set when the tournament is completed.'),
		createdAt: z.iso.datetime().describe('When they signed up.'),
		requirements: z.array(requirementCheckResource)
	})
	.describe('A participant of the tournament.')
	.register(components, { id: 'Participant' });

/** A match's status as players see it. */
const MATCH_STATUSES = [
	'waiting',
	'ready',
	'reported',
	'disputed',
	'completed',
	'bye',
	'skipped'
] as const satisfies readonly MatchProgress[];

export const matchResource = z
	.object({
		id: z.uuid(),
		number: z.int().describe('Shown to players, counted in play order within the group.'),
		stageIndex: z.int().describe('0 for the first stage.'),
		groupIndex: z.int(),
		side: z.enum(['main', 'winners', 'losers', 'grand_final', 'third_place']),
		status: z
			.enum(MATCH_STATUSES)
			.describe(
				'`reported` while one player has reported, `disputed` when the reports differ, `skipped` for an unneeded grand final reset.'
			),
		entrants: z
			.tuple([z.uuid().nullable(), z.uuid().nullable()])
			.describe('Participant ids; `null` while not known yet.'),
		result: z
			.object({
				scores: scoresTuple.nullable(),
				winnerId: z.uuid().nullable().describe('`null` for a draw.')
			})
			.nullable(),
		helpRequested: z.boolean().describe('A player asked the organizers for help.'),
		reports: z
			.array(z.object({ participantId: z.uuid(), scores: scoresTuple }))
			.describe("The players' reports for the current entrants.")
	})
	.describe('A played match: byes are left out.')
	.register(components, { id: 'Match' });

export const matchDetailResource = matchResource
	.extend({
		decidedBy: z
			.enum(['organizer', 'api_key'])
			.nullable()
			.describe('Who set the result over the reports; `null` when the players agreed.')
	})
	.describe('A match, and who decided its result.')
	.register(components, { id: 'MatchDetail' });

export const reportOutcomeResource = z
	.object({
		outcome: z
			.enum(['saved', 'agreed', 'disputed'])
			.describe(
				'`saved` until the opponent reports, `agreed` when both reports match, `disputed` when they differ.'
			),
		match: matchDetailResource
	})
	.describe('What a report did.')
	.register(components, { id: 'ReportOutcome' });

export const messageResource = z
	.object({
		id: z.uuid(),
		body: z.string(),
		createdAt: z.iso.datetime(),
		asOrganizer: z.boolean().describe("Written by an organizer who isn't playing, or an API key."),
		author: z
			.object({ username: z.string(), displayName: z.string() })
			.nullable()
			.describe('`null` when an API key wrote it.'),
		apiKey: z.string().nullable().describe('The name of the API key that wrote it.')
	})
	.describe('A message in a match room.')
	.register(components, { id: 'Message' });

// Path and query parameters. An id that can't exist is not found.

export const tournamentParams = z.object({
	tournamentId: z.uuid('Tournament not found.').describe('The tournament id.')
});

export const participantParams = tournamentParams.extend({
	participantId: z.uuid('Participant not found.').describe('The participant id.')
});

export const matchParams = tournamentParams.extend({
	matchId: matchIdSchema.describe('The match id.')
});

export const matchQuery = z.object({
	stage: z.coerce
		.number()
		.int()
		.min(0)
		.optional()
		.describe('Only matches of this stage: 0 is the first.'),
	status: z.enum(MATCH_STATUSES).optional().describe('Only matches with this status.')
});
