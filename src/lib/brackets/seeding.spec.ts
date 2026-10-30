import { describe, expect, it } from 'vitest';
import { meetingRound, nextPowerOfTwo, seedAdvancers, seedOrder, snakeGroups } from './seeding';

describe('seedOrder', () => {
	it('matches the standard bracket order', () => {
		expect(seedOrder(1)).toEqual([1]);
		expect(seedOrder(2)).toEqual([1, 2]);
		expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
		expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
	});

	it('pairs seeds that add up to size + 1 in the first round', () => {
		for (const size of [2, 4, 8, 16, 32, 64]) {
			const order = seedOrder(size);
			for (let i = 0; i < size; i += 2) expect(order[i] + order[i + 1]).toBe(size + 1);
		}
	});

	it('keeps the top 2^j seeds in different sections of the bracket', () => {
		const size = 64;
		const order = seedOrder(size);
		for (let sections = 2; sections <= size; sections *= 2) {
			const sectionOf = (seed: number) => Math.floor(order.indexOf(seed) / (size / sections));
			const top = Array.from({ length: sections }, (_, i) => sectionOf(i + 1));
			expect(new Set(top).size).toBe(sections);
		}
	});
});

describe('meetingRound', () => {
	it('is the round two seeds would meet in', () => {
		expect(meetingRound(1, 8, 8)).toBe(1);
		expect(meetingRound(1, 4, 8)).toBe(2);
		expect(meetingRound(1, 2, 8)).toBe(3);
		expect(meetingRound(3, 6, 8)).toBe(1);
	});
});

describe('nextPowerOfTwo', () => {
	it.each([
		[1, 1],
		[2, 2],
		[3, 4],
		[9, 16],
		[64, 64]
	])('%i → %i', (n, size) => expect(nextPowerOfTwo(n)).toBe(size));
});

describe('snakeGroups', () => {
	it('deals seeds back and forth', () => {
		expect(snakeGroups([1, 2, 3, 4, 5, 6, 7, 8], 4)).toEqual([
			[1, 8],
			[2, 7],
			[3, 6],
			[4, 5]
		]);
		expect(snakeGroups([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3)).toEqual([
			[1, 6, 7],
			[2, 5, 8],
			[3, 4, 9, 10]
		]);
	});
});

describe('seedAdvancers', () => {
	const groups = (count: number, size: number) =>
		Array.from({ length: count }, (_, g) =>
			Array.from({ length: size }, (_, place) => `${String.fromCharCode(65 + g)}${place + 1}`)
		);
	const meetings = (seeds: string[]) => {
		const size = nextPowerOfTwo(seeds.length);
		const result: number[] = [];
		seeds.forEach((a, i) =>
			seeds.forEach((b, j) => {
				if (i < j && a[0] === b[0]) result.push(meetingRound(i + 1, j + 1, size));
			})
		);
		return result;
	};

	it('seeds group winners first, in group order', () => {
		expect(seedAdvancers(groups(4, 4), 2).slice(0, 4)).toEqual(['A1', 'B1', 'C1', 'D1']);
	});

	it('keeps entrants from the same group apart until the final', () => {
		expect(seedAdvancers(groups(2, 4), 2)).toEqual(['A1', 'B1', 'A2', 'B2']);
		expect(seedAdvancers(groups(4, 4), 2)).toEqual([
			'A1',
			'B1',
			'C1',
			'D1',
			'B2',
			'A2',
			'D2',
			'C2'
		]);
		expect(meetings(seedAdvancers(groups(4, 4), 2))).toEqual([3, 3, 3, 3]);
		expect(meetings(seedAdvancers(groups(8, 4), 2)).every((round) => round === 4)).toBe(true);
	});

	it('avoids same-group first-round matches for uneven fields', () => {
		for (const [count, perGroup] of [
			[3, 2],
			[3, 3],
			[6, 2],
			[4, 3],
			[5, 2]
		]) {
			const seeds = seedAdvancers(groups(count, 4), perGroup);
			expect(seeds).toHaveLength(count * perGroup);
			expect(meetings(seeds).every((round) => round > 1)).toBe(true);
		}
	});

	it('skips groups too small to fill a tier', () => {
		expect(seedAdvancers([['A1', 'A2'], ['B1']], 2)).toEqual(['A1', 'B1', 'A2']);
	});
});
