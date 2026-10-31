<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import type { Scores } from '#lib/matchReports.ts';
	import ScoreLines from './ScoreLines.svelte';

	let {
		action,
		names,
		scores = null,
		winner = null,
		submit,
		quiet = false,
		children
	}: {
		action: string;
		/** The two players' names, in slot order. */
		names: [string, string];
		/** Prefills the inputs. */
		scores?: Scores | null;
		/** A decided match's winner: their slot is filled, while the scores stay editable. */
		winner?: 0 | 1 | null;
		/** The submit button's label. */
		submit: string;
		/** In a long list: the button only turns primary once a score is changed. */
		quiet?: boolean;
		/** Hidden inputs sent with the scores. */
		children?: Snippet;
	} = $props();

	let edited = $state(false);
</script>

<form method="POST" {action} class="result" use:enhance oninput={() => (edited = true)}>
	{@render children?.()}
	<ScoreLines {names} {scores} {winner} />
	<button class="btn small" class:primary={!quiet || edited} type="submit">{submit}</button>
</form>

<style lang="scss">
	.result {
		display: flex;
		flex: 1 1 auto;
		align-items: flex-end;
		gap: 1.25rem;
	}
</style>
