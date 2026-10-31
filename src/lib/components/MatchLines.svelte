<script lang="ts" module>
	export interface MatchSide {
		name: string;
		score?: number | null;
		/** Not a player yet: "Winner of #3", a bye, or not known. */
		placeholder?: boolean;
	}
</script>

<script lang="ts">
	// A match the way a draw sheet prints it: each name on its own line, the score at the line's
	// end, the two lines meeting in a joint. The winner's line is inked; the viewer's line is blue.
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
		/** The players' reports disagree: the joint is redrawn in the organizer's red pen. */
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
		position: relative;
		display: flex;
		flex-direction: column;
		min-width: 0;
		margin-right: 0.75rem;

		// The joint where the two lines meet, and the stub the winner's line leaves on.
		&::after {
			content: '';
			position: absolute;
			right: 0;
			top: calc(50% - 1px);
			height: 50%;
			border-right: 1px solid var(--line);
		}

		&::before {
			content: '';
			position: absolute;
			right: -0.75rem;
			top: 75%;
			width: 0.75rem;
			border-top: 1px solid var(--line);
		}

		&.decided::before {
			border-top: 2px solid var(--text);
			margin-top: -0.5px;
		}

		&.disputed::after {
			border-right: 2px solid var(--danger);
		}

		&.disputed::before {
			border-top-color: var(--danger);
		}
	}

	// The printed line a name is written on, as a bar at the foot of the row.
	.line {
		position: relative;
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		min-height: 30px;
		padding: 0 0.5rem 0.3rem 0.1rem;

		&::after {
			content: '';
			position: absolute;
			inset: auto 0 0;
			height: 1px;
			background: var(--line);
		}

		&.winner::after {
			height: 2px;
			background: var(--text);
		}

		&.winner {
			.who {
				font-weight: 700;
			}

			.score {
				font-weight: 700;
			}
		}

		&.loser .who,
		&.loser .score {
			color: var(--text-muted);
		}

		&.me::after {
			height: 2px;
			background: var(--accent);
		}

		&.me {
			.who {
				color: var(--accent);
			}
		}
	}

	.who {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-stretch: var(--name-stretch);
		font-weight: 600;

		&.placeholder {
			color: var(--text-muted);
			font-stretch: 100%;
			font-weight: 400;
		}
	}

	.score {
		flex: none;
		min-width: 1.25rem;
		text-align: right;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.lg {
		.line {
			min-height: 44px;
			padding-bottom: 0.4rem;
		}

		.who,
		.score {
			font-size: 1.25rem;
			line-height: 1.2;
		}
	}
</style>
