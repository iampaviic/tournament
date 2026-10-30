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

<form method="POST" {action} class="result" use:enhance>
	{@render children?.()}
	<label>
		<span>{names[0]}</span>
		<input
			name="score1"
			type="number"
			min="0"
			required
			value={scores?.[0] ?? ''}
			aria-label={m.matches_score({ name: names[0] })}
		/>
	</label>
	<label>
		<input
			name="score2"
			type="number"
			min="0"
			required
			value={scores?.[1] ?? ''}
			aria-label={m.matches_score({ name: names[1] })}
		/>
		<span>{names[1]}</span>
	</label>
	<button class="btn small primary" type="submit">{submit}</button>
</form>

<style lang="scss">
	.result {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;

		label {
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}

		input {
			width: 4rem;
		}
	}
</style>
