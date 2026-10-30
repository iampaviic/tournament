<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import StageFields from '#lib/components/StageFields.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let stageCount = $derived(String(data.stageCount));
	const locked = $derived(
		data.tournament.status === 'running' || data.tournament.status === 'completed'
	);
</script>

{#if form?.error}
	<p class="alert error" role="alert">{form.error}</p>
{:else if form?.message}
	<p class="alert success" role="status">{form.message}</p>
{/if}
{#if locked}<p class="alert">{m.tadmin_locked()}</p>{/if}

<form
	method="POST"
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
>
	<fieldset class="plain" disabled={locked}>
		<fieldset class="card count">
			<legend>{m.structure_stages()}</legend>
			<label class="checkbox">
				<input type="radio" name="stageCount" value="1" bind:group={stageCount} />
				{m.structure_one_stage()}
			</label>
			<label class="checkbox">
				<input type="radio" name="stageCount" value="2" bind:group={stageCount} />
				{m.structure_two_stages()}
			</label>
		</fieldset>

		{#if stageCount === '2'}
			<StageFields title={m.stage_group()} prefix="s0." stage={data.twoStages[0]} groupStage />
			<StageFields title={m.stage_final()} prefix="s1." stage={data.twoStages[1]} />
		{:else}
			<StageFields title={m.stage_only()} prefix="s0." stage={data.oneStage} />
		{/if}

		<button class="btn primary" type="submit">{m.structure_save()}</button>
	</fieldset>
</form>

<style lang="scss">
	.plain {
		border: 0;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: flex-start;

		> :global(*) {
			align-self: stretch;
		}

		> button {
			align-self: flex-start;
		}
	}

	.count {
		margin: 0;

		legend {
			font-weight: 600;
			padding: 0 0.25rem;
		}
	}
</style>
