import {
	compareTemplates,
	type BracketSide,
	type MatchTemplate,
	type Outcome,
	type SlotSource
} from '#lib/brackets/index.ts';

/** Sizes of the bracket view in CSS pixels. The view renders cards with exactly these sizes. */
export const CARD_WIDTH = 184;
export const SLOT_HEIGHT = 30;
export const CARD_HEIGHT = SLOT_HEIGHT * 2;
export const HEADER_HEIGHT = 36;
const COLUMN_GAP = 48;
const ROW_GAP = 16;
const SECTION_GAP = 48;
/** Room left of the first column for match numbers. */
const GUTTER = 36;

/** What an empty slot will be filled with, e.g. "Winner of #3". */
export type SlotHint = { outcome: Outcome; number: number } | null;

export interface PlacedMatch<T> {
	match: T;
	/** Match number shown to players, counted in play order. */
	number: number;
	x: number;
	y: number;
	hints: [SlotHint, SlotHint];
}

export interface RoundHeader {
	side: BracketSide;
	round: number;
	/** Shown rounds in this side of the bracket, so the last ones can be called "Final" etc. */
	rounds: number;
	x: number;
	y: number;
}

export interface Connector {
	from: string;
	to: string;
	/** SVG path from the joint at `from`'s right edge to the line of the slot of `to` it feeds. */
	path: string;
}

export interface BracketLayout<T> {
	matches: PlacedMatch<T>[];
	headers: RoundHeader[];
	connectors: Connector[];
	width: number;
	height: number;
}

/**
 * Finds the templates that will never be played because a bye is in them: an empty spot, the
 * loser of a bye, or the winner of two empty spots. This follows from the templates alone, so it
 * never changes while the stage is played.
 */
function analyzeByes(templates: MatchTemplate[]) {
	const byId = new Map(templates.map((t) => [t.id, t]));
	const memo = new Map<string, boolean>();
	const isEmpty = (source: SlotSource): boolean => {
		if ('entrant' in source) return source.entrant === null;
		const template = byId.get(source.match);
		if (!template) return false;
		return source.outcome === 'loser'
			? isBye(template)
			: isEmpty(template.slots[0]) && isEmpty(template.slots[1]);
	};
	const isBye = (template: MatchTemplate): boolean => {
		let bye = memo.get(template.id);
		if (bye === undefined) {
			bye = !template.resetOf && (isEmpty(template.slots[0]) || isEmpty(template.slots[1]));
			memo.set(template.id, bye);
		}
		return bye;
	};
	return { byes: new Set(templates.filter(isBye).map((t) => t.id)), isEmpty };
}

export const structuralByes = (templates: MatchTemplate[]) => analyzeByes(templates).byes;

/**
 * Numbers the matches that are played, in the order they can be played: a match comes after the
 * matches its entrants come from. Byes get no number.
 */
export function matchNumbers(templates: MatchTemplate[]): Map<string, number> {
	const byId = new Map(templates.map((t) => [t.id, t]));
	const depths = new Map<string, number>();
	const depth = (template: MatchTemplate): number => {
		let value = depths.get(template.id);
		if (value === undefined) {
			const sources = [
				...template.slots.map((s) => ('match' in s ? s.match : '')),
				template.resetOf
			]
				.map((id) => byId.get(id ?? ''))
				.filter((t) => t !== undefined);
			value = 1 + Math.max(0, ...sources.map(depth));
			depths.set(template.id, value);
		}
		return value;
	};
	const byes = structuralByes(templates);
	const numbers = new Map<string, number>();
	templates
		.filter((t) => !byes.has(t.id))
		.toSorted((a, b) => depth(a) - depth(b) || compareTemplates(a, b))
		.forEach((t, i) => numbers.set(t.id, i + 1));
	return numbers;
}

/**
 * Places a stage's (or group's) matches on a canvas. Rounds are columns, and a match sits level
 * with the matches that feed it, so elimination brackets form a tree. The losers bracket goes below
 * the winners bracket, the grand final right of both, and the third place match under the final.
 * Byes are hidden but keep their place so the tree stays regular; columns of only byes are dropped.
 */
export function layoutBracket<T extends { template: MatchTemplate }>(items: T[]): BracketLayout<T> {
	const sorted = items.toSorted((a, b) => compareTemplates(a.template, b.template));
	const templates = sorted.map((item) => item.template);
	const byId = new Map(templates.map((t) => [t.id, t]));
	const { byes, isEmpty } = analyzeByes(templates);
	const numbers = matchNumbers(templates);
	const visible = (id: string) => byId.has(id) && !byes.has(id);
	const columnX = (column: number) => GUTTER + column * (CARD_WIDTH + COLUMN_GAP);

	const positions = new Map<string, { x: number; y: number }>();
	const headers: RoundHeader[] = [];
	const columnCounts = new Map<BracketSide, number>();
	let bottom = 0;

	for (const side of new Set(templates.map((t) => t.side))) {
		const inSide = templates.filter((t) => t.side === side);
		const rounds = [...new Set(inSide.map((t) => t.round))];

		if (side === 'third_place') {
			const final = templates.findLast((t) => t.side === 'main');
			const anchor = (final && positions.get(final.id)) ?? { x: GUTTER, y: bottom };
			inSide.forEach((template, i) => {
				const y = anchor.y + (i + 1) * (CARD_HEIGHT + HEADER_HEIGHT + ROW_GAP);
				positions.set(template.id, { x: anchor.x, y });
				if (visible(template.id)) {
					headers.push({ side, round: 1, rounds: 1, x: anchor.x, y: y - HEADER_HEIGHT });
				}
			});
			continue;
		}

		const shownRounds = rounds.filter((round) =>
			inSide.some((t) => t.round === round && visible(t.id))
		);
		columnCounts.set(side, shownRounds.length);
		const firstColumn = side === 'grand_final' ? Math.max(0, ...columnCounts.values()) : 0;
		const top = side === 'losers' ? bottom + SECTION_GAP + HEADER_HEIGHT : HEADER_HEIGHT;

		for (const round of rounds) {
			// Only the rows matter for a column of byes: later matches line up with them.
			const column = shownRounds.indexOf(round);
			const x = columnX(firstColumn + Math.max(column, 0));
			// Rounds are counted from the first shown column, so there always is a "Losers round 1".
			if (column !== -1) {
				const shown = { round: column + 1, rounds: shownRounds.length };
				headers.push({ side, ...shown, x, y: top - HEADER_HEIGHT });
			}

			let next = top;
			for (const template of inSide.filter((t) => t.round === round)) {
				const feeders = template.slots
					.map((slot) =>
						'match' in slot && slot.outcome === 'winner' ? positions.get(slot.match) : undefined
					)
					.filter((p) => p !== undefined);
				const level = feeders.length
					? feeders.reduce((sum, p) => sum + p.y, 0) / feeders.length
					: next;
				const y = Math.max(level, next);
				positions.set(template.id, { x, y });
				next = y + CARD_HEIGHT + ROW_GAP;
			}
		}
		if (side !== 'grand_final') {
			for (const template of inSide) {
				bottom = Math.max(bottom, positions.get(template.id)!.y + CARD_HEIGHT);
			}
		}
	}

	const hint = (source: SlotSource): SlotHint => {
		if ('entrant' in source) return null;
		if (visible(source.match))
			return { outcome: source.outcome, number: numbers.get(source.match)! };
		// The winner of a bye is whoever fills its other slot.
		const template = byId.get(source.match);
		if (!template || source.outcome === 'loser') return null;
		const filled = template.slots.find((slot) => !isEmpty(slot));
		return filled ? hint(filled) : null;
	};

	const matches: PlacedMatch<T>[] = [];
	const connectors: Connector[] = [];
	for (const item of sorted) {
		const { id, slots } = item.template;
		if (!visible(id)) continue;
		const to = positions.get(id)!;
		matches.push({
			match: item,
			number: numbers.get(id)!,
			...to,
			hints: [hint(slots[0]), hint(slots[1])]
		});
		slots.forEach((slot, index) => {
			if (!('match' in slot) || slot.outcome !== 'winner' || !visible(slot.match)) return;
			// Drawn like a printed draw: from the joint where the feeder's two lines meet to the line
			// the winner's name is written on.
			const from = positions.get(slot.match)!;
			const y1 = from.y + SLOT_HEIGHT * 1.5;
			const y2 = to.y + SLOT_HEIGHT * (index + 1);
			const xm = to.x - COLUMN_GAP / 2;
			connectors.push({
				from: slot.match,
				to: id,
				path: `M${from.x + CARD_WIDTH} ${y1}H${xm}V${y2}H${to.x}`
			});
		});
	}

	return {
		matches,
		headers,
		connectors,
		width: Math.max(0, ...matches.map((p) => p.x + CARD_WIDTH)),
		height: Math.max(0, ...matches.map((p) => p.y + CARD_HEIGHT))
	};
}
