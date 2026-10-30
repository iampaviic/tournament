<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import DateTimeInput from '#lib/components/DateTimeInput.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form?.values ?? data.settings);
	const errors: Partial<Record<string, string[]>> = $derived(form?.errors ?? {});
</script>

<form
	method="POST"
	action="?/update"
	class="card"
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
>
	{#if form?.saved}
		<p class="alert success" role="status">{m.tournament_saved()}</p>
	{/if}

	<div class="field">
		<label for="name">{m.tournament_name()}</label>
		<input id="name" name="name" type="text" value={values.name} required maxlength="80" />
		{#each errors.name ?? [] as error (error)}<span class="error">{error}</span>{/each}
	</div>

	<div class="field">
		<label for="slug">{m.tournament_slug()}</label>
		<input id="slug" name="slug" type="text" value={values.slug} required maxlength="40" />
		<span class="hint">{m.tournament_slug_hint({ org: data.org.slug, slug: values.slug })}</span>
		{#each errors.slug ?? [] as error (error)}<span class="error">{error}</span>{/each}
	</div>

	<div class="field">
		<label for="description">{m.tournament_description()}</label>
		<textarea id="description" name="description" rows="8" maxlength="5000"
			>{values.description}</textarea
		>
		<span class="hint">{m.tournament_description_hint()}</span>
		{#each errors.description ?? [] as error (error)}<span class="error">{error}</span>{/each}
	</div>

	<div class="row">
		<div class="field">
			<label for="startsAt">{m.tournament_starts_at()}</label>
			<DateTimeInput id="startsAt" name="startsAt" value={values.startsAt} />
			{#each errors.startsAt ?? [] as error (error)}<span class="error">{error}</span>{/each}
		</div>
		<div class="field">
			<label for="participantLimit">{m.tournament_limit()}</label>
			<input
				id="participantLimit"
				name="participantLimit"
				type="number"
				min="2"
				max="1024"
				value={values.participantLimit ?? ''}
			/>
			<span class="hint">{m.tournament_limit_hint()}</span>
			{#each errors.participantLimit ?? [] as error (error)}<span class="error">{error}</span
				>{/each}
		</div>
	</div>

	<button class="btn primary" type="submit">{m.tournament_save()}</button>
</form>

<form method="POST" action="?/delete" class="card danger-zone" use:enhance>
	<h2>{m.tournament_delete_title()}</h2>
	<p class="muted">{m.tournament_delete_lead({ slug: data.settings.slug })}</p>
	<div class="field">
		<label for="confirm">{m.tournament_delete_confirm()}</label>
		<input id="confirm" name="confirm" type="text" autocomplete="off" required />
		{#if form?.deleteError}<span class="error">{form.deleteError}</span>{/if}
	</div>
	<button class="btn danger" type="submit">{m.tournament_delete_submit()}</button>
</form>

<style lang="scss">
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.5rem;
	}

	.danger-zone {
		margin-top: 1.5rem;
		border-color: var(--danger);

		h2 {
			font-size: 1.1rem;
			color: var(--danger);
		}
	}
</style>
