<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import type { Scores } from '#lib/matchReports.ts';

	let {
		action,
		names,
		scores = null,
		submit,
		children
	}: {
		action: string;
		/** The two players' names, in slot order. */
		names: [string, string];
		/** Prefills the inputs. */
		scores?: Scores | null;
		/** The submit button's label. */
		submit: string;
		/** Hidden inputs sent with the scores. */
		children?: Snippet;
	} = $props();
</script>

<!-- Scores are written where the draw sheet has them: at the end of each player's line. -->
<form method="POST" {action} class="result" use:enhance>
	{@render children?.()}
	<div class="lines">
		{#each [0, 1] as const as i (i)}
			<label class="line">
				<span class="name">{names[i]}</span>
				<input
					name="score{i + 1}"
					type="number"
					min="0"
					required
					value={scores?.[i] ?? ''}
					aria-label={m.matches_score({ name: names[i] })}
				/>
			</label>
		{/each}
	</div>
	<button class="btn small primary" type="submit">{submit}</button>
</form>

<style lang="scss">
	.result {
		display: flex;
		flex: 1 1 auto;
		align-items: flex-end;
		gap: 1.25rem;
	}

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

	// The score cell at the line's end: a pale field that only shows its edge when it is in use.
	input {
		flex: none;
		width: 3rem;
		height: 28px;
		min-height: 28px;
		padding: 0 0.25rem;
		border-color: transparent;
		border-radius: var(--radius-tag);
		background: var(--surface-2);
		text-align: center;
		font-variant-numeric: tabular-nums;

		&:hover {
			border-color: var(--control);
		}
	}
</style>
