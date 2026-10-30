import { describe, expect, it } from 'vitest';
import {
	doubleElimination,
	generateStage,
	roundRobin,
	singleElimination,
	type MatchTemplate,
	type StageType
} from '#lib/brackets/index.ts';
import { seedIds } from '#lib/brackets/simulate.ts';
import {
	CARD_HEIGHT,
	CARD_WIDTH,
	layoutBracket,
	matchNumbers,
	structuralByes,
	type BracketLayout
} from './bracketLayout';

const items = (templates: MatchTemplate[]) => templates.map((template) => ({ template }));
const center = (layout: BracketLayout<{ template: MatchTemplate }>, id: string) => {
	const placed = layout.matches.find((p) => p.match.template.id === id)!;
	return { x: placed.x, y: placed.y + CARD_HEIGHT / 2 };
};

function expectNoOverlaps(layout: BracketLayout<{ template: MatchTemplate }>) {
	const boxes = layout.matches;
	const overlaps: string[] = [];
	for (let i = 0; i < boxes.length; i++) {
		for (let j = i + 1; j < boxes.length; j++) {
			const a = boxes[i];
			const b = boxes[j];
			if (
				a.x < b.x + CARD_WIDTH &&
				b.x < a.x + CARD_WIDTH &&
				a.y < b.y + CARD_HEIGHT &&
				b.y < a.y + CARD_HEIGHT
			) {
				overlaps.push(`${a.match.template.id}/${b.match.template.id}`);
			}
		}
	}
	expect(overlaps).toEqual([]);
}

describe('structuralByes', () => {
	it('finds byes and the losers bracket matches they empty', () => {
		// 5 entrants in an 8 bracket: seeds 1–3 have byes.
		const templates = doubleElimination(seedIds(5));
		const byes = structuralByes(templates);
		expect([...byes].filter((id) => id.startsWith('W'))).toEqual(['W1-1', 'W1-3', 'W1-4']);
		// Losers round 1 pairs the losers of W1-1/W1-2 and W1-3/W1-4; all of them involve a bye.
		expect(byes.has('L1-1')).toBe(true);
		expect(byes.has('L1-2')).toBe(true);
		expect(byes.has('GF2')).toBe(false);
	});
});

describe('matchNumbers', () => {
	it('numbers played matches in play order and skips byes', () => {
		const numbers = matchNumbers(singleElimination(seedIds(5)));
		expect([...numbers.entries()]).toEqual([
			['M1-2', 1],
			['M2-1', 2],
			['M2-2', 3],
			['M3-1', 4]
		]);
	});

	it('interleaves the winners and losers brackets', () => {
		const numbers = matchNumbers(doubleElimination(seedIds(8)));
		// Losers round 1 can start as soon as winners round 1 is done, before winners round 2 ends.
		expect(numbers.get('W1-4')).toBe(4);
		expect(numbers.get('W2-1')).toBe(5);
		expect(numbers.get('L1-1')).toBe(7);
		expect(numbers.get('GF1')).toBe(14);
		expect(numbers.get('GF2')).toBe(15);
	});
});

describe('layoutBracket', () => {
	it('builds a tree for single elimination', () => {
		const layout = layoutBracket(items(singleElimination(seedIds(8))));
		expect(layout.matches).toHaveLength(7);
		expect(new Set(layout.matches.map((p) => p.x)).size).toBe(3);
		expect(center(layout, 'M2-1').y).toBe(
			(center(layout, 'M1-1').y + center(layout, 'M1-2').y) / 2
		);
		expect(center(layout, 'M3-1').y).toBe(
			(center(layout, 'M2-1').y + center(layout, 'M2-2').y) / 2
		);
		expect(layout.connectors).toHaveLength(6);
		expect(layout.headers.map((h) => [h.side, h.round, h.rounds])).toEqual([
			['main', 1, 3],
			['main', 2, 3],
			['main', 3, 3]
		]);
		expectNoOverlaps(layout);
	});

	it('hides byes and labels the slots they fill', () => {
		const layout = layoutBracket(items(singleElimination(seedIds(5))));
		expect(layout.matches.map((p) => [p.match.template.id, p.number])).toEqual([
			['M1-2', 1],
			['M2-1', 2],
			['M2-2', 3],
			['M3-1', 4]
		]);
		// Seed 1's bye is not drawn, so only the real first round match connects to round 2.
		expect(layout.connectors.map((c) => `${c.from}>${c.to}`)).toEqual([
			'M1-2>M2-1',
			'M2-1>M3-1',
			'M2-2>M3-1'
		]);
		const semi = layout.matches.find((p) => p.match.template.id === 'M2-1')!;
		expect(semi.hints).toEqual([null, { outcome: 'winner', number: 1 }]);
	});

	it('puts the third place match under the final', () => {
		const layout = layoutBracket(items(singleElimination(seedIds(4), { thirdPlaceMatch: true })));
		const final = center(layout, 'M2-1');
		const third = center(layout, 'TP');
		expect(third.x).toBe(final.x);
		expect(third.y).toBeGreaterThan(final.y + CARD_HEIGHT);
		expect(layout.headers.at(-1)).toMatchObject({ side: 'third_place' });
		expect(layout.matches.find((p) => p.match.template.id === 'TP')!.hints).toEqual([
			{ outcome: 'loser', number: 1 },
			{ outcome: 'loser', number: 2 }
		]);
		expectNoOverlaps(layout);
	});

	it('places the losers bracket below and the grand final to the right', () => {
		const layout = layoutBracket(items(doubleElimination(seedIds(8))));
		const winnersBottom = Math.max(
			...layout.matches
				.filter((p) => p.match.template.side === 'winners')
				.map((p) => p.y + CARD_HEIGHT)
		);
		const losers = layout.matches.filter((p) => p.match.template.side === 'losers');
		expect(Math.min(...losers.map((p) => p.y))).toBeGreaterThan(winnersBottom);

		const rightmost = Math.max(
			...layout.matches.filter((p) => p.match.template.side !== 'grand_final').map((p) => p.x)
		);
		expect(center(layout, 'GF1').x).toBeGreaterThan(rightmost);
		expect(center(layout, 'GF2').x).toBeGreaterThan(center(layout, 'GF1').x);
		expect(center(layout, 'GF2').y).toBe(center(layout, 'GF1').y);
		expect(
			layout.connectors
				.filter((c) => c.to === 'GF1')
				.map((c) => c.from)
				.sort()
		).toEqual(['L4-1', 'W3-1']);
		expectNoOverlaps(layout);
	});

	it('leaves out columns that only hold byes', () => {
		const layout = layoutBracket(items(doubleElimination(seedIds(5))));
		const losersHeaders = layout.headers.filter((h) => h.side === 'losers');
		// Losers round 1 is all byes, so round 2 comes first and is shown as round 1.
		expect(losersHeaders.map((h) => [h.round, h.rounds])).toEqual([
			[1, 3],
			[2, 3],
			[3, 3]
		]);
		expect(losersHeaders[0].x).toBe(layout.headers[0].x);
		const firstLosers = layout.matches.find((p) => p.match.template.side === 'losers')!;
		expect(firstLosers.match.template.round).toBe(2);
	});

	it('lays out round robin rounds as columns without connectors', () => {
		const layout = layoutBracket(items(roundRobin(seedIds(4))));
		expect(layout.matches).toHaveLength(6);
		expect(new Set(layout.matches.map((p) => p.x)).size).toBe(3);
		expect(layout.connectors).toEqual([]);
		expectNoOverlaps(layout);
	});

	it('handles every format and size', () => {
		const types: StageType[] = ['single_elimination', 'double_elimination', 'round_robin', 'swiss'];
		for (const type of types) {
			for (let n = 2; n <= (type === 'round_robin' ? 16 : 33); n++) {
				const templates = generateStage(type, seedIds(n), { thirdPlaceMatch: true });
				const layout = layoutBracket(items(templates));
				expect(layout.matches.length).toBe(templates.length - structuralByes(templates).size);
				expectNoOverlaps(layout);
				for (const placed of layout.matches) {
					expect(placed.x).toBeGreaterThanOrEqual(0);
					expect(placed.y).toBeGreaterThanOrEqual(0);
					expect(placed.x + CARD_WIDTH).toBeLessThanOrEqual(layout.width);
					expect(placed.y + CARD_HEIGHT).toBeLessThanOrEqual(layout.height);
				}
				const ids = new Set(layout.matches.map((p) => p.match.template.id));
				for (const connector of layout.connectors) {
					expect(ids.has(connector.from) && ids.has(connector.to)).toBe(true);
				}
				const numbers = layout.matches.map((p) => p.number).sort((a, b) => a - b);
				expect(numbers).toEqual(numbers.map((_, i) => i + 1));
			}
		}
	});
});
