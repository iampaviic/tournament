import type { MatchTemplate } from './types';

export interface RoundRobinOptions {
	/** Play everyone twice, the second time with slots swapped. */
	double?: boolean;
}

/**
 * Round robin with the circle method: entrant 1 stays put and the others rotate, so everyone meets
 * everyone once in n - 1 rounds (n rounds when n is odd, with one entrant sitting out each round).
 */
export function roundRobin(seeds: string[], options: RoundRobinOptions = {}): MatchTemplate[] {
	const circle: (string | null)[] = [...seeds];
	if (circle.length % 2 === 1) circle.push(null);
	const n = circle.length;
	const rounds: [string, string][][] = [];

	for (let r = 0; r < n - 1; r++) {
		const pairs: [string, string][] = [];
		for (let i = 0; i < n / 2; i++) {
			let a = circle[i];
			let b = circle[n - 1 - i];
			if (a === null || b === null) continue;
			// Alternate who is listed first for the fixed entrant, so slots balance out.
			if (i === 0 && r % 2 === 1) [a, b] = [b, a];
			pairs.push([a, b]);
		}
		rounds.push(pairs);
		circle.splice(1, 0, circle.pop()!);
	}
	if (options.double) {
		const second = rounds.map((pairs) => pairs.map(([a, b]): [string, string] => [b, a]));
		rounds.push(...second);
	}

	return rounds.flatMap((pairs, r) =>
		pairs.map(([a, b], i): MatchTemplate => ({
			id: `R${r + 1}-${i + 1}`,
			side: 'main',
			round: r + 1,
			position: i + 1,
			slots: [{ entrant: a }, { entrant: b }]
		}))
	);
}
