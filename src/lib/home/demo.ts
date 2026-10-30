import {
	generateStage,
	pairSwissRound,
	resolveStage,
	type MatchResult,
	type MatchTemplate,
	type StageType
} from '#lib/brackets/index.ts';
import { layoutBracket } from '#lib/bracketLayout.ts';
import type { BracketMatch } from '#lib/bracketView.ts';
import type { ThemeParticipant } from '#lib/themes/index.ts';

/** Example players for the home page. Shown as examples, never as real users or results. */
export const NAMES = ['Aiko', 'Bram', 'Cleo', 'Dario', 'Esme', 'Femi', 'Goran', 'Hana'];
const ids = NAMES.map((_, i) => `p${i + 1}`);

export const players: Record<string, ThemeParticipant> = Object.fromEntries(
	NAMES.map((name, i) => [ids[i], { id: ids[i], name, avatarUrl: null, fields: {} }])
);

const SCORES: [number, number][] = [
	[2, 0],
	[2, 1],
	[0, 2],
	[3, 1],
	[2, 1],
	[1, 2]
];

/** Plays the first `count` ready matches in template order, the scores taken from a fixed list. */
function play(
	templates: MatchTemplate[],
	count: number,
	results: Record<string, MatchResult> = {}
) {
	for (let n = 0; n < count; n++) {
		const ready = resolveStage(templates, results).matches.find((m) => m.status === 'ready');
		if (!ready) break;
		const scores = SCORES[n % SCORES.length];
		results[ready.template.id] = {
			entrants: ready.entrants as [string, string],
			winner: scores[0] > scores[1] ? 0 : 1,
			scores
		};
	}
	return results;
}

function toMatches(
	templates: MatchTemplate[],
	results: Record<string, MatchResult>
): BracketMatch[] {
	return resolveStage(templates, results).matches.map((state) => ({
		id: state.template.id,
		template: state.template,
		status: state.status,
		entrants: state.entrants,
		result: state.result ?? null
	}));
}

function formatSample(type: StageType, size: number, played: number) {
	const seeds = ids.slice(0, size);
	let templates = generateStage(type, seeds, { thirdPlaceMatch: false, grandFinal: 'reset' });
	let results = play(templates, played);
	if (type === 'swiss') {
		templates = [
			...templates,
			...pairSwissRound(seeds, resolveStage(templates, results).matches, 2)
		];
		results = play(templates, played, results);
	}
	return layoutBracket(toMatches(templates, results));
}

/** One example bracket per format, part way through. */
export const formats = [
	{ type: 'single_elimination', layout: formatSample('single_elimination', 8, 5) },
	{ type: 'double_elimination', layout: formatSample('double_elimination', 4, 4) },
	{ type: 'round_robin', layout: formatSample('round_robin', 4, 4) },
	{ type: 'swiss', layout: formatSample('swiss', 6, 3) }
] as const satisfies { type: StageType; layout: ReturnType<typeof layoutBracket> }[];

/** A four-player draw, one semifinal played, for the "play the draw" step. */
export const miniDraw = formatSample('single_elimination', 4, 1);

/** Final places of the example event. */
export const placings = [
	{ rank: 1, name: 'Hana' },
	{ rank: 2, name: 'Esme' },
	{ rank: 3, name: 'Goran' },
	{ rank: 4, name: 'Femi' }
];
