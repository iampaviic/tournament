<script lang="ts" module>
	export interface MatchSide {
		name: string;
		score?: number | null;
		/** Not a player yet: "Winner of #3", a bye, or not known. */
		placeholder?: boolean;
	}
</script>

<script lang="ts">
	// A match as a versus plate: player one's slot over player two's, each with its side's tick and
	// the score at the end. Once decided the winner's slot fills with its side's colour and the
	// loser's drains; the viewer's slot is ringed in gold.
	let {
		sides,
		winner = null,
		me = null,
		disputed = false,
		size = 'md'
	}: {
		sides: [MatchSide, MatchSide];
		winner?: 0 | 1 | null;
		/** The side the viewer plays on. */
		me?: 0 | 1 | null;
		/** The players' reports disagree: the plate is ringed in the dispute colour. */
		disputed?: boolean;
		size?: 'md' | 'lg';
	} = $props();
</script>

<div class="lines {size}" class:decided={winner !== null} class:disputed>
	{#each [0, 1] as const as i (i)}
		{@const side = sides[i]}
		<div
			class="line"
			class:winner={winner === i}
			class:loser={winner !== null && winner !== i}
			class:me={me === i}
		>
			<span class="who" class:placeholder={side.placeholder}>{side.name}</span>
			<span class="score">{side.score ?? ''}</span>
		</div>
	{/each}
</div>

<style lang="scss">
	.lines {
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface-2);

		&.disputed {
			border-color: var(--danger);
			box-shadow: 0 0 0 1px var(--danger);
		}
	}

	.line {
		--side: var(--p1);
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 32px;
		padding: 0 0.65rem;

		+ .line {
			--side: var(--p2);
			border-top: 1px solid var(--border);
		}

		// The side's tick, slanted like the cut between the two sides of a versus screen.
		&::before {
			content: '';
			flex: none;
			width: 4px;
			height: 14px;
			border-radius: 1px;
			background: var(--side);
			transform: skewX(var(--slant));
		}

		&.winner {
			background: var(--side);
			color: var(--on-side);

			&::before {
				background: var(--on-side);
			}

			.who,
			.score {
				color: var(--on-side);
			}
		}

		&.loser .who,
		&.loser .score {
			color: var(--text-muted);
		}

		&.me {
			box-shadow: inset 0 0 0 2px var(--accent);

			&:not(.winner) .who {
				color: var(--accent-ink);
			}
		}
	}

	.who {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 700;

		&.placeholder {
			color: var(--text-muted);
			font-weight: 400;
		}
	}

	.score {
		flex: none;
		min-width: 1.5rem;
		text-align: right;
		font-family: var(--font-display);
		font-variant-numeric: tabular-nums;
	}

	.lg {
		.line {
			min-height: 48px;
			padding-inline: 0.9rem;

			&::before {
				width: 6px;
				height: 22px;
			}
		}

		.who,
		.score {
			font-family: var(--font-display);
			font-weight: 400;
			font-size: 1.25rem;
			line-height: 1.2;
		}
	}
</style>
