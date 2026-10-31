<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let {
		names,
		scores = null,
		onscores
	}: {
		/** The two players' names, in slot order. */
		names: [string, string];
		/** Prefills the inputs; `null` leaves one empty. */
		scores?: readonly [number | null, number | null] | null;
		/** Called as either score is typed; an empty field is `null`. */
		onscores?: (scores: [number | null, number | null]) => void;
	} = $props();

	const inputs: HTMLInputElement[] = [];
	const read = (input: HTMLInputElement) => (input.value === '' ? null : Number(input.value));
</script>

<!-- Scores are written where the draw sheet has them: at the end of each player's line. -->
<div class="lines">
	{#each [0, 1] as const as i (i)}
		<label class="line">
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
		position: relative;
		display: flex;
		flex-direction: column;
		flex: 0 1 18rem;
		min-width: 9rem;
		margin-right: 0.75rem;

		// The joint where the two lines meet.
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
	}

	.line {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		padding: 0.2rem 0.5rem 0.2rem 0.1rem;
		border-bottom: 1px solid var(--line);
		cursor: text;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	// The score cell at the line's end.
	input {
		flex: none;
		width: 3rem;
		height: 28px;
		min-height: 28px;
		padding: 0 0.25rem;
		border-radius: var(--radius-tag);
		text-align: center;
		font-variant-numeric: tabular-nums;
	}
</style>
