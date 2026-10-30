import { describe, expect, it } from 'vitest';
import type { MatchStatus } from '#lib/brackets/index.ts';
import {
	matchProgress,
	matchQueue,
	reportOutcome,
	sameScores,
	type MatchProgress,
	type ReportOutcome,
	type Scores,
	type SideReport
} from './matchReports';

const first: SideReport = { side: 0, scores: [2, 1] };
const agreeing: SideReport = { side: 1, scores: [2, 1] };
const disagreeing: SideReport = { side: 1, scores: [1, 2] };

describe('sameScores', () => {
	it('compares both scores', () => {
		expect(sameScores([2, 1], [2, 1])).toBe(true);
		expect(sameScores([2, 1], [1, 2])).toBe(false);
		expect(sameScores([2, 1], [2, 0])).toBe(false);
	});
});

describe('matchProgress', () => {
	const cases: [MatchStatus, SideReport[], MatchProgress][] = [
		['waiting', [], 'waiting'],
		['ready', [], 'ready'],
		['ready', [first], 'reported'],
		['ready', [disagreeing], 'reported'],
		['ready', [first, agreeing], 'reported'],
		['ready', [first, disagreeing], 'disputed'],
		['completed', [first, agreeing], 'completed'],
		['completed', [], 'completed'],
		['bye', [], 'bye'],
		['skipped', [], 'skipped']
	];
	it.each(cases)('%s with %j is %s', (status, reports, expected) => {
		expect(matchProgress(status, reports)).toBe(expected);
	});
});

describe('reportOutcome', () => {
	const cases: [string, SideReport[], 0 | 1, Scores, ReportOutcome][] = [
		['a first report', [], 0, [2, 1], 'saved'],
		['a first report by the other side', [], 1, [0, 2], 'saved'],
		['an edit before the opponent responds', [first], 0, [2, 0], 'saved'],
		['the same scores as the opponent', [first], 1, [2, 1], 'agreed'],
		['different scores from the opponent', [first], 1, [1, 2], 'disputed'],
		['a report after both sides reported', [first, disagreeing], 0, [1, 2], 'closed'],
		['a report by the other side after both reported', [first, disagreeing], 1, [2, 1], 'closed']
	];
	it.each(cases)('%s', (_, reports, side, scores, expected) => {
		expect(reportOutcome(reports, side, scores)).toBe(expected);
	});
});

describe('matchQueue', () => {
	const item = (
		id: string,
		progress: MatchProgress,
		{ helpRequested = false, stageIndex = 0, groupIndex = 0, number = 1 } = {}
	) => ({ id, progress, helpRequested, stageIndex, groupIndex, number });

	it('only keeps matches that are being played', () => {
		const items = [
			item('waiting', 'waiting'),
			item('completed', 'completed', { helpRequested: true }),
			item('bye', 'bye'),
			item('skipped', 'skipped'),
			item('ready', 'ready')
		];
		expect(matchQueue(items).map((i) => i.id)).toEqual(['ready']);
	});

	it('puts disputes first, then help requests, then reported, then ready matches', () => {
		const items = [
			item('ready', 'ready', { number: 1 }),
			item('reported', 'reported', { number: 2 }),
			item('help', 'ready', { number: 3, helpRequested: true }),
			item('disputed', 'disputed', { number: 4 }),
			item('reported with help', 'reported', { number: 5, helpRequested: true }),
			item('disputed with help', 'disputed', { number: 6, helpRequested: true })
		];
		expect(matchQueue(items).map((i) => i.id)).toEqual([
			'disputed',
			'disputed with help',
			'help',
			'reported with help',
			'reported',
			'ready'
		]);
	});

	it('breaks ties by stage, group and match number', () => {
		const items = [
			item('s1 g0 #1', 'ready', { stageIndex: 1 }),
			item('s0 g1 #1', 'ready', { groupIndex: 1 }),
			item('s0 g0 #2', 'ready', { number: 2 }),
			item('s0 g0 #1', 'ready')
		];
		expect(matchQueue(items).map((i) => i.id)).toEqual([
			's0 g0 #1',
			's0 g0 #2',
			's0 g1 #1',
			's1 g0 #1'
		]);
	});
});
