export function nextPowerOfTwo(n: number): number {
	let size = 1;
	while (size < n) size *= 2;
	return size;
}

/**
 * Seeds in bracket order for a bracket of `size` (a power of two), so that adjacent pairs are the
 * first-round matches and the top seeds can only meet late: 8 → [1, 8, 4, 5, 2, 7, 3, 6].
 */
export function seedOrder(size: number): number[] {
	let order = [1];
	while (order.length < size) {
		const n = order.length * 2;
		order = order.flatMap((seed) => [seed, n + 1 - seed]);
	}
	return order;
}

/** Each seed's index in bracket order; index 0 is unused. */
function bracketPositions(size: number): number[] {
	const positions: number[] = [];
	seedOrder(size).forEach((seed, index) => (positions[seed] = index));
	return positions;
}

/** Two bracket positions first share a match in the round of their highest differing bit. */
const roundBetween = (a: number, b: number) => Math.floor(Math.log2(a ^ b)) + 1;

/** The round (1-based) in which seeds `a` and `b` would meet if both kept winning. */
export function meetingRound(a: number, b: number, size: number): number {
	const positions = bracketPositions(size);
	return roundBetween(positions[a], positions[b]);
}

/**
 * Splits seeded entrants into groups in snake order (A B C D D C B A …), so each group gets a
 * similar mix of strong and weak entrants.
 */
export function snakeGroups<T>(seeds: T[], groupCount: number): T[][] {
	const groups: T[][] = Array.from({ length: groupCount }, () => []);
	seeds.forEach((seed, i) => {
		const lap = Math.floor(i / groupCount);
		const offset = i % groupCount;
		groups[lap % 2 === 0 ? offset : groupCount - 1 - offset].push(seed);
	});
	return groups;
}

/**
 * Seeds the entrants advancing from a group stage into an elimination stage.
 *
 * Group winners take the top seeds in group order, then the runners-up, and so on. Within each
 * tier, entrants are placed so that they meet entrants from their own group as late as possible.
 *
 * @param rankings each group's entrants, best first
 * @param perGroup how many entrants advance from each group
 */
export function seedAdvancers<T>(rankings: T[][], perGroup: number): T[] {
	const tiers = Array.from({ length: perGroup }, (_, tier) =>
		rankings.flatMap((group, groupIndex) =>
			tier < group.length ? [{ entrant: group[tier], groupIndex }] : []
		)
	);
	const total = tiers.reduce((sum, tier) => sum + tier.length, 0);
	const positions = bracketPositions(nextPowerOfTwo(total));
	const meet = (a: number, b: number) => roundBetween(positions[a], positions[b]);

	const placed: { entrant: T; groupIndex: number; seed: number }[] = [];
	for (const tier of tiers) {
		const remaining = [...tier];
		while (remaining.length) {
			const seed = placed.length + 1;
			// How late each candidate would meet the closest entrant from its own group.
			const separation = (groupIndex: number) =>
				Math.min(
					Infinity,
					...placed.filter((p) => p.groupIndex === groupIndex).map((p) => meet(seed, p.seed))
				);
			let best = 0;
			for (let i = 1; i < remaining.length; i++) {
				if (separation(remaining[i].groupIndex) > separation(remaining[best].groupIndex)) best = i;
			}
			const [chosen] = remaining.splice(best, 1);
			placed.push({ ...chosen, seed });
		}
	}
	return placed.map((p) => p.entrant);
}
