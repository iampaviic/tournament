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
	// A versus plate: player one's slot over player two's. A decided match's winner takes the plate
	// in its side's colour; the connector leaves from the plate's right edge.
	.match {
		position: absolute;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
		overflow: visible;
		border: 1px solid var(--bracket-border);
		border-radius: 6px;
		background: var(--bracket-card);

		&.ready {
			border-color: var(--bracket-line);
			background: var(--bracket-ready);
		}
	}

	// A dispute: the plate ringed and its number set on a chip in the dispute colour.
	.disputed {
		border-color: var(--danger);
		box-shadow: 0 0 0 1px var(--danger);

		.number {
			padding: 0 0.3rem;
			border-radius: 3px;
			background: var(--danger);
			color: var(--bracket-background);
			font-weight: 700;
		}
	}

	// Level with the first name, between the card and the connector that arrives half a gap away.
	.number {
		position: absolute;
		right: calc(100% + 5px);
		top: 25%;
		transform: translateY(-50%);
		font-size: 0.6875rem;
		color: var(--bracket-muted);
		font-variant-numeric: tabular-nums;
	}

	.slot {
		--side: var(--bracket-p1, var(--bracket-ink));
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.45rem;
		min-height: 0;
		padding: 0 0.5rem;
		font-size: 0.875rem;

		+ .slot {
			--side: var(--bracket-p2, var(--bracket-ink));
			border-top: 1px solid var(--bracket-border);
		}

		&:first-of-type {
			border-radius: 5px 5px 0 0;
		}

		&:last-of-type {
			border-radius: 0 0 5px 5px;
		}

		// The side's tick, slanted like the cut on a versus screen.
		&::before {
			content: '';
			flex: none;
			width: 3px;
			height: 12px;
			border-radius: 1px;
			background: var(--side);
			transform: skewX(-10deg);
		}

		&.winner {
			background: var(--side);

			&::before {
				background: var(--bracket-on-side, var(--bracket-background));
			}

			.who,
			.score {
				color: var(--bracket-on-side, var(--bracket-background));
			}

			.who {
				font-weight: 700;
			}
		}

		&.loser .who,
		&.loser .score {
			color: var(--bracket-muted);
		}

		&.highlighted {
			box-shadow: inset 0 0 0 2px var(--bracket-highlight);

			&:not(.winner) .who {
				color: var(--bracket-highlight);
			}
		}
	}

	.who {
		flex: 1;
		display: flex;
		align-items: center;
		min-width: 0;
		overflow: hidden;
		font-weight: 600;
	}

	.placeholder {
		color: var(--bracket-muted);
		font-size: 0.8125rem;
		font-weight: 400;
		white-space: nowrap;
	}

	.score {
		flex-shrink: 0;
		min-width: 1.25rem;
		text-align: right;
		color: var(--bracket-text);
		font-family: var(--font-display);
		font-variant-numeric: tabular-nums;
	}
</style>
