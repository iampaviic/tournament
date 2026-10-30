<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import BracketCanvas from '#lib/components/bracket/BracketCanvas.svelte';
	import { layoutBracket } from '#lib/bracketLayout.ts';
	import { themes, themeStyle } from '#lib/themes/index.ts';
	import { sampleMatches, sampleParticipants } from '#lib/themes/sample.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const available = $derived(themes.filter((theme) => data.themeIds.includes(theme.id)));
	let selected = $derived(data.current);
	const layout = layoutBracket(sampleMatches);
	const PREVIEW_SCALE = 0.75;
</script>

<form
	method="POST"
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
>
	{#if form?.saved}
		<p class="alert success" role="status">{m.theme_saved()}</p>
	{:else if form?.error}
		<p class="alert error" role="alert">{form.error}</p>
	{/if}
	<p class="muted">{m.theme_lead()}</p>

	<div class="options">
		{#each available as theme (theme.id)}
			<label class="card option" class:selected={selected === theme.id}>
				<span class="title">
					<input type="radio" name="theme" value={theme.id} bind:group={selected} />
					<strong>{theme.name}</strong>
				</span>
				<span class="muted description">{theme.description}</span>
				<span
					class="preview"
					style={themeStyle(theme.style)}
					style:height="{(layout.height + 32) * PREVIEW_SCALE}px"
					aria-hidden="true"
				>
					<span class="scaled" style:transform="scale({PREVIEW_SCALE})">
						<BracketCanvas {layout} participants={sampleParticipants} {theme} elimination />
					</span>
				</span>
			</label>
		{/each}
	</div>

	<button class="btn primary" type="submit">{m.theme_save()}</button>
</form>

<style lang="scss">
	.options {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 30rem), 1fr));
		gap: 1rem;
		margin: 1rem 0 1.5rem;
	}

	.option {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		cursor: pointer;

		&.selected {
			border-color: var(--accent);
			outline: 1px solid var(--accent);
		}
	}

	.title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.description {
		font-size: var(--fs-body);
	}

	.preview {
		display: block;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: var(--bracket-background);
		border: 1px solid var(--border);
		pointer-events: none;
	}

	.scaled {
		display: block;
		padding: 16px;
		transform-origin: 0 0;
	}
</style>
