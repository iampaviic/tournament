<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { BracketMatch } from '#lib/bracketView.ts';
	import { CARD_HEIGHT, CARD_WIDTH, type PlacedMatch, type SlotHint } from '#lib/bracketLayout.ts';
	import type { BracketTheme, ThemeParticipant } from '#lib/themes/index.ts';

	let {
		placed,
		participants,
		theme,
		highlighted,
		disputed = false
	}: {
		placed: PlacedMatch<BracketMatch>;
		participants: Record<string, ThemeParticipant>;
		theme: BracketTheme;
		/** The participant whose matches are highlighted. */
		highlighted: string | null;
		/** The players' reports disagree; an organizer decides. */
		disputed?: boolean;
	} = $props();

	const match = $derived(placed.match);
	const Label = $derived(theme.ParticipantLabel);
	const winner = $derived(match.result?.winner);
	const involved = $derived(highlighted !== null && match.entrants.includes(highlighted));

	const hintText = (hint: SlotHint) =>
		hint === null
			? m.match_tbd()
			: hint.outcome === 'winner'
				? m.bracket_winner_of({ number: hint.number })
				: m.bracket_loser_of({ number: hint.number });
</script>

<div
	class="match"
	class:ready={match.status === 'ready' && !disputed}
	class:disputed
	class:involved
	style:left="{placed.x}px"
	style:top="{placed.y}px"
	style:width="{CARD_WIDTH}px"
	style:height="{CARD_HEIGHT}px"
	data-testid="bracket-match"
	aria-label={disputed
		? `${m.bracket_match({ number: placed.number })}, ${m.match_status_disputed()}`
		: m.bracket_match({ number: placed.number })}
	role="group"
>
	<span class="number" aria-hidden="true">{placed.number}</span>
	{#each [0, 1] as const as slot (slot)}
		{@const entrant = match.entrants[slot]}
		{@const done = match.status === 'completed' && winner !== null && winner !== undefined}
		<div
			class="slot"
			class:winner={done && winner === slot}
			class:loser={done && winner !== slot}
			class:highlighted={entrant !== undefined && entrant !== null && entrant === highlighted}
			data-entrant={entrant ?? undefined}
		>
			<span class="who">
				{#if entrant}
					<Label
						participant={participants[entrant] ?? {
							id: entrant,
							name: '?',
							avatarUrl: null,
							fields: {}
						}}
					/>
				{:else if entrant === null}
					<span class="placeholder">{m.match_bye()}</span>
				{:else}
					<span class="placeholder">{hintText(placed.hints[slot])}</span>
				{/if}
			</span>
			<span class="score">{match.result?.scores?.[slot] ?? ''}</span>
		</div>
	{/each}
</div>

<style lang="scss">
	// Drawn like a printed draw: each name sits on its own line, the score at the line's end, and
	// the two lines meet in a joint at the right. A decided match's winner line is set in ink.
	.match {
		position: absolute;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		border-radius: 4px;

		// The joint where the two lines meet; connectors leave from its middle.
		&::after {
			content: '';
			position: absolute;
			right: 0;
			top: calc(50% - 1px);
			height: 50%;
			border-right: 1px solid var(--bracket-line);
		}

		&.ready {
			background: var(--bracket-ready);
		}

		&.involved .slot.highlighted::after {
			height: 2px;
			background: var(--bracket-highlight);
		}
	}

	// The organizer's red pen: the number circled and the joint drawn over in red.
	.disputed {
		&::after {
			border-right: 2px solid var(--danger);
		}

		// Circled in the clear space between the incoming connector and the card.
		.number {
			right: calc(100% + 2px);
			display: grid;
			place-items: center;
			min-width: 1.125rem;
			height: 1.125rem;
			border: 1.5px solid var(--danger);
			border-radius: 50%;
			color: var(--danger);
			font-weight: 700;
		}
	}

	// Level with the first name, clear of the connectors that arrive on the lines.
	.number {
		position: absolute;
		right: calc(100% + 10px);
		top: 25%;
		transform: translateY(-50%);
		font-size: 0.6875rem;
		color: var(--bracket-muted);
		font-variant-numeric: tabular-nums;
	}

	.slot {
		position: relative;
		flex: 1;
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
		min-height: 0;
		padding: 0 0.4rem 0.3rem;
		font-size: 0.875rem;

		// The printed line the name is written on.
		&::after {
			content: '';
			position: absolute;
			inset: auto 0 0;
			height: 1px;
			background: var(--bracket-line);
		}

		&.winner::after {
			height: 2px;
			background: var(--bracket-ink);
		}

		&.winner {
			.who {
				font-weight: 650;
			}

			.score {
				color: var(--bracket-text);
				font-weight: 700;
			}
		}

		&.loser .who,
		&.loser .score {
			color: var(--bracket-muted);
		}

		&.highlighted .who {
			color: var(--bracket-highlight);
		}
	}

	.who {
		flex: 1;
		display: flex;
		align-items: center;
		min-width: 0;
		overflow: hidden;
		font-stretch: 88%;
		font-weight: 550;
	}

	.placeholder {
		color: var(--bracket-muted);
		font-size: 0.8125rem;
		font-stretch: 100%;
		font-weight: 400;
		white-space: nowrap;
	}

	.score {
		flex-shrink: 0;
		min-width: 1.25rem;
		text-align: right;
		color: var(--bracket-text);
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}
</style>
