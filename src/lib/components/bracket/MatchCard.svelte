<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { BracketMatch } from '#lib/bracketView.ts';
	import { CARD_HEIGHT, CARD_WIDTH, type PlacedMatch, type SlotHint } from '#lib/bracketLayout.ts';
	import type { BracketTheme, ThemeParticipant } from '#lib/themes/index.ts';

	let {
		placed,
		participants,
		theme,
		highlighted
	}: {
		placed: PlacedMatch<BracketMatch>;
		participants: Record<string, ThemeParticipant>;
		theme: BracketTheme;
		/** The participant whose matches are highlighted. */
		highlighted: string | null;
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
	class:ready={match.status === 'ready'}
	class:involved
	style:left="{placed.x}px"
	style:top="{placed.y}px"
	style:width="{CARD_WIDTH}px"
	style:height="{CARD_HEIGHT}px"
	data-testid="bracket-match"
	aria-label={m.bracket_match({ number: placed.number })}
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
	.match {
		position: absolute;
		display: flex;
		flex-direction: column;
		background: var(--bracket-card);
		border: 1px solid var(--bracket-border);
		border-radius: var(--bracket-radius);
		box-sizing: border-box;

		&.ready {
			border-color: color-mix(in srgb, var(--bracket-highlight) 40%, var(--bracket-border));
		}

		&.involved {
			border-color: var(--bracket-highlight);
			box-shadow: 0 0 0 1px var(--bracket-highlight);
		}
	}

	.number {
		position: absolute;
		right: calc(100% + 8px);
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.7rem;
		color: var(--bracket-muted);
		font-variant-numeric: tabular-nums;
	}

	.slot {
		flex: 1;
		display: flex;
		align-items: stretch;
		min-height: 0;
		font-size: 0.85rem;

		& + .slot {
			border-top: 1px solid var(--bracket-border);
		}

		&.winner {
			font-weight: 600;

			.score {
				background: var(--bracket-accent);
				color: var(--bracket-accent-text);
			}
		}

		&.loser .who {
			opacity: 0.6;
		}

		&.highlighted {
			background: color-mix(in srgb, var(--bracket-highlight) 14%, transparent);
		}
	}

	.who {
		flex: 1;
		display: flex;
		align-items: center;
		min-width: 0;
		padding: 0 0.5rem;
		overflow: hidden;
	}

	.placeholder {
		color: var(--bracket-muted);
		font-style: italic;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.score {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		flex-shrink: 0;
		border-left: 1px solid var(--bracket-border);
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.slot:first-child .score {
		border-top-right-radius: calc(var(--bracket-radius) - 1px);
	}

	.slot:last-child .score {
		border-bottom-right-radius: calc(var(--bracket-radius) - 1px);
	}
</style>
