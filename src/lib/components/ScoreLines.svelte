<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let {
		names,
		scores = null,
		winner = null,
		onscores
	}: {
		/** The two players' names, in slot order. */
		names: [string, string];
		/** Prefills the inputs; `null` leaves one empty. */
		scores?: readonly [number | null, number | null] | null;
		/** A decided match's winner: their slot fills with its side's colour, the other drains. */
		winner?: 0 | 1 | null;
		/** Called as either score is typed; an empty field is `null`. */
		onscores?: (scores: [number | null, number | null]) => void;
	} = $props();

	const inputs: HTMLInputElement[] = $state([]);
	const read = (input: HTMLInputElement) => (input.value === '' ? null : Number(input.value));
</script>

<!-- The versus plate with a score cell at the end of each player's slot. -->
<div class="lines">
	{#each [0, 1] as const as i (i)}
		<label class="line" class:winner={winner === i} class:loser={winner !== null && winner !== i}>
			<span class="name">{names[i]}</span>
			<input
				bind:this={inputs[i]}
				name="score{i + 1}"
				type="number"
				min="0"
				required
				value={scores?.[i] ?? ''}
				aria-label={m.matches_score({ name: names[i] })}
				oninput={() => onscores?.([read(inputs[0]), read(inputs[1])])}
			/>
		</label>
	{/each}
</div>

<style lang="scss">
	.lines {
		display: flex;
		flex-direction: column;
		flex: 0 1 18rem;
		min-width: 9rem;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface-2);
	}

	.line {
		--side: var(--p1);
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 40px;
		padding: 0.25rem 0.35rem 0.25rem 0.65rem;
		cursor: text;

		+ .line {
			--side: var(--p2);
			border-top: 1px solid var(--border);
		}

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
		}

		&.loser .name {
			color: var(--text-muted);
		}
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	// The score cell at the slot's end.
	input {
		flex: none;
		width: 3.25rem;
		height: 32px;
		min-height: 32px;
		padding: 0 0.25rem;
		border-radius: var(--radius-tag);
		text-align: center;
		font-family: var(--font-display);
		font-variant-numeric: tabular-nums;
	}
</style>
