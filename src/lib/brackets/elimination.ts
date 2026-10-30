import { nextPowerOfTwo, seedOrder } from './seeding';
import type { BracketSide, Entrant, MatchTemplate, Outcome, SlotSource } from './types';

export interface SingleEliminationOptions {
	/** Play a match between the semifinal losers for third place. */
	thirdPlaceMatch?: boolean;
}

export interface DoubleEliminationOptions {
	/**
	 * `reset`: if the losers bracket champion wins the grand final, a second grand final is played,
	 * so both finalists have lost twice. `single`: the first grand final decides.
	 */
	grandFinal?: 'single' | 'reset';
}

const from = (match: string, outcome: Outcome): SlotSource => ({ match, outcome });

function match(
	id: string,
	side: BracketSide,
	round: number,
	position: number,
	slots: [SlotSource, SlotSource],
	extra: Partial<MatchTemplate> = {}
): MatchTemplate {
	return { id, side, round, position, slots, ...extra };
}

/** The first-round slots of a bracket: seeds in bracket order, padded with byes. */
function firstRoundEntrants(seeds: string[]): Entrant[] {
	const size = Math.max(2, nextPowerOfTwo(seeds.length));
	return seedOrder(size).map((seed) => seeds[seed - 1] ?? null);
}

/** Builds a winners-side bracket (used on its own for single elimination). */
function winnersBracket(seeds: string[], side: 'main' | 'winners', prefix: string) {
	const entrants = firstRoundEntrants(seeds);
	const rounds = Math.log2(entrants.length);
	const templates: MatchTemplate[] = [];
	const ids: string[][] = [];

	for (let round = 1; round <= rounds; round++) {
		const count = entrants.length / 2 ** round;
		ids.push([]);
		for (let position = 1; position <= count; position++) {
			const id = `${prefix}${round}-${position}`;
			const slots: [SlotSource, SlotSource] =
				round === 1
					? [{ entrant: entrants[2 * position - 2] }, { entrant: entrants[2 * position - 1] }]
					: [
							from(ids[round - 2][2 * position - 2], 'winner'),
							from(ids[round - 2][2 * position - 1], 'winner')
						];
			templates.push(match(id, side, round, position, slots));
			ids[round - 1].push(id);
		}
	}
	return { templates, ids, rounds };
}

/** Single elimination: one loss and you're out. Top seeds get byes when the field isn't a power of two. */
export function singleElimination(
	seeds: string[],
	options: SingleEliminationOptions = {}
): MatchTemplate[] {
	const { templates, ids, rounds } = winnersBracket(seeds, 'main', 'M');

	// Losers of round r finish in place 2^(rounds - r) + 1: final → 2, semifinals → 3, …
	for (const template of templates) {
		template.placement = { loser: 2 ** (rounds - template.round) + 1 };
	}
	templates[templates.length - 1].placement = { winner: 1, loser: 2 };

	if (options.thirdPlaceMatch && rounds >= 2) {
		const semifinals = ids[rounds - 2];
		for (const id of semifinals) delete templates.find((t) => t.id === id)!.placement;
		templates.push(
			match(
				'TP',
				'third_place',
				1,
				1,
				[from(semifinals[0], 'loser'), from(semifinals[1], 'loser')],
				{
					placement: { winner: 3, loser: 4 }
				}
			)
		);
	}
	return templates;
}

/**
 * Order in which the losers of a winners round drop into the losers bracket, so they don't meet
 * someone they just played. Alternating reverse and reverse-half-shift was picked by simulating
 * brackets of 8–256: no rematches before the losers final when favorites win, and few otherwise.
 */
function dropOrder<T>(losers: T[], winnersRound: number): T[] {
	if (winnersRound % 2 === 0) return [...losers].reverse();
	const half = Math.floor(losers.length / 2);
	return [...losers.slice(0, half).reverse(), ...losers.slice(half).reverse()];
}

/**
 * Double elimination: entrants drop into the losers bracket after their first loss and are out
 * after their second. The winners and losers bracket champions meet in the grand final.
 */
export function doubleElimination(
	seeds: string[],
	options: DoubleEliminationOptions = {}
): MatchTemplate[] {
	const grandFinal = options.grandFinal ?? 'reset';
	const winners = winnersBracket(seeds, 'winners', 'W');
	const templates = [...winners.templates];
	const k = winners.rounds;

	// Losers bracket: round 1 pairs the winners round 1 losers; each even round takes in the losers
	// of the next winners round; each odd round after that halves the field.
	const losersRounds: string[][] = [];
	let previous: SlotSource[] = [];
	for (let round = 1; round <= 2 * (k - 1); round++) {
		let pairs: [SlotSource, SlotSource][];
		if (round === 1) {
			const losers = winners.ids[0].map((id) => from(id, 'loser'));
			pairs = chunk(losers);
		} else if (round % 2 === 0) {
			const winnersRound = round / 2 + 1;
			const dropping = dropOrder(
				winners.ids[winnersRound - 1].map((id) => from(id, 'loser')),
				winnersRound
			);
			pairs = previous.map((source, i) => [source, dropping[i]]);
		} else {
			pairs = chunk(previous);
		}

		const ids = pairs.map((slots, i) => {
			const id = `L${round}-${i + 1}`;
			templates.push(match(id, 'losers', round, i + 1, slots));
			return id;
		});
		losersRounds.push(ids);
		previous = ids.map((id) => from(id, 'winner'));
	}

	// Losers of losers round r finish below everyone eliminated later.
	let better = 2;
	for (let round = losersRounds.length; round >= 1; round--) {
		for (const id of losersRounds[round - 1]) {
			templates.find((t) => t.id === id)!.placement = { loser: better + 1 };
		}
		better += losersRounds[round - 1].length;
	}

	const winnersFinal = winners.ids[k - 1][0];
	const losersChampion =
		losersRounds.length > 0
			? from(losersRounds[losersRounds.length - 1][0], 'winner')
			: from(winnersFinal, 'loser');
	templates.push(
		match('GF1', 'grand_final', 1, 1, [from(winnersFinal, 'winner'), losersChampion], {
			placement: { winner: 1, loser: 2 }
		})
	);
	if (grandFinal === 'reset') {
		templates.push(
			match('GF2', 'grand_final', 2, 1, [from('GF1', 'loser'), from('GF1', 'winner')], {
				placement: { winner: 1, loser: 2 },
				resetOf: 'GF1'
			})
		);
	}
	return templates;
}

function chunk<T>(items: T[]): [T, T][] {
	const pairs: [T, T][] = [];
	for (let i = 0; i < items.length; i += 2) pairs.push([items[i], items[i + 1]]);
	return pairs;
}
