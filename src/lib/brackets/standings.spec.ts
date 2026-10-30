import { describe, expect, it } from 'vitest';
import { resolveStage } from './resolve';
import { roundRobin } from './roundRobin';
import { computeStandings } from './standings';
import type { MatchResult, MatchState } from './types';

/** Completed matches from `a-b:3-1` style shorthands (`3-3` is a draw). */
function played(...games: string[]): MatchState[] {
	const templates = games.map((_, i) => ({
		id: `G${i}`,
		side: 'main' as const,
		round: 1,
		position: i + 1,
		slots: [
			{ entrant: games[i].split(':')[0].split('-')[0] },
			{ entrant: games[i].split(':')[0].split('-')[1] }
		] as [{ entrant: string }, { entrant: string }]
	}));
	const results: Record<string, MatchResult> = {};
	games.forEach((game, i) => {
		const [pair, score] = game.split(':');
		const [a, b] = pair.split('-');
		const [x, y] = score.split('-').map(Number);
		results[`G${i}`] = { entrants: [a, b], winner: x === y ? null : x > y ? 0 : 1, scores: [x, y] };
	});
	return resolveStage(templates, results).matches;
}

const order = (rows: { entrant: string }[]) => rows.map((r) => r.entrant);

describe('computeStandings', () => {
	it('counts points, games and records', () => {
		const rows = computeStandings(['a', 'b', 'c'], played('a-b:2-0', 'b-c:2-1', 'a-c:1-1'), {
			scoring: { win: 3, draw: 1, loss: 0 }
		});
		expect(rows).toEqual([
			expect.objectContaining({ entrant: 'a', rank: 1, points: 4, wins: 1, draws: 1, losses: 0 }),
			expect.objectContaining({ entrant: 'b', rank: 2, points: 3, gamesWon: 2, gamesLost: 3 }),
			expect.objectContaining({ entrant: 'c', rank: 3, points: 1, played: 2 })
		]);
	});

	it('restarts head-to-head among the entrants still tied', () => {
		// A double round robin where a, b, c and d all finish on 4.5 points.
		const matches = played(
			...['a-b:1-0', 'a-b:0-1', 'a-c:1-0', 'a-c:1-0', 'a-d:1-0', 'a-d:0-0'],
			...['c-b:1-0', 'c-b:1-0', 'b-d:1-0', 'b-d:0-0', 'c-d:0-0', 'c-d:0-1'],
			...['b-e:1-0', 'b-e:1-0', 'c-e:1-0', 'c-e:1-0', 'd-e:1-0', 'd-e:1-0', 'e-a:1-0', 'e-a:1-0']
		);
		const rows = computeStandings(['a', 'b', 'c', 'd', 'e'], matches, {
			tiebreakers: ['head_to_head']
		});
		expect(rows.slice(0, 4).every((r) => r.points === 4.5)).toBe(true);
		// Among all four, a has the most head-to-head points (4.5 vs 2.5 each). Among b, c and d
		// alone, c has 2.5, d 2 and b 1.5.
		expect(order(rows)).toEqual(['a', 'c', 'd', 'b', 'e']);
		expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
	});

	it('shares ranks when every tiebreaker is equal and orders by seed', () => {
		const rows = computeStandings(['x', 'y'], played('x-y:1-1'), {
			tiebreakers: ['head_to_head', 'game_difference']
		});
		expect(rows.map((r) => [r.entrant, r.rank])).toEqual([
			['x', 1],
			['y', 1]
		]);
	});

	it('uses game difference and games won', () => {
		const rows = computeStandings(
			['a', 'b', 'c'],
			played('a-c:3-0', 'b-c:3-2', 'a-b:0-3', 'c-a:0-0'),
			{
				scoring: { win: 1, draw: 0, loss: 0 },
				tiebreakers: ['game_difference', 'games_won']
			}
		);
		expect(order(rows)).toEqual(['b', 'a', 'c']);
	});

	it('computes Buchholz and Sonneborn-Berger', () => {
		// a beat b, b beat c, c drew with a.
		const rows = computeStandings(['a', 'b', 'c'], played('a-b:1-0', 'b-c:1-0', 'a-c:1-1'));
		const byEntrant = Object.fromEntries(rows.map((r) => [r.entrant, r]));
		expect(byEntrant.a).toMatchObject({
			points: 1.5,
			buchholz: 1 + 0.5,
			sonnebornBerger: 1 + 0.25
		});
		expect(byEntrant.b).toMatchObject({ points: 1, buchholz: 1.5 + 0.5, sonnebornBerger: 0.5 });
	});

	it('counts byes as wins without games', () => {
		const matches = resolveStage(
			[
				{
					id: 'B',
					side: 'main',
					round: 1,
					position: 1,
					slots: [{ entrant: 'a' }, { entrant: null }]
				}
			],
			{}
		).matches;
		expect(computeStandings(['a'], matches)[0]).toMatchObject({
			points: 1,
			wins: 1,
			byes: 1,
			played: 0
		});
	});

	it('ignores matches that are not finished', () => {
		const matches = resolveStage(roundRobin(['a', 'b', 'c']), {}).matches;
		expect(
			computeStandings(['a', 'b', 'c'], matches).every((r) => r.points === 0 && r.rank === 1)
		).toBe(true);
	});
});
