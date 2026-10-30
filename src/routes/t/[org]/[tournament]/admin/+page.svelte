<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import DateTimeInput from '#lib/components/DateTimeInput.svelte';
	import GamePicker from '#lib/components/GamePicker.svelte';
	import SteamGame from '#lib/components/SteamGame.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const params = $derived({ org: data.org.slug, tournament: data.tournament.slug });
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
		<input
			id="name"
			name="name"
			type="text"
			value={values.name}
			required
			maxlength="80"
			aria-describedby="name-error"
			aria-invalid={errors.name ? 'true' : undefined}
		/>
		{#if errors.name}<span class="error" id="name-error">{errors.name.join(' ')}</span>{/if}
	</div>

	<div class="field">
		<label for="slug">{m.tournament_slug()}</label>
		<input
			id="slug"
			name="slug"
			type="text"
			value={values.slug}
			required
			maxlength="40"
			aria-describedby="slug-hint slug-error"
			aria-invalid={errors.slug ? 'true' : undefined}
		/>
		<span class="hint" id="slug-hint"
			>{m.tournament_slug_hint({ org: data.org.slug, slug: values.slug })}</span
		>
		{#if errors.slug}<span class="error" id="slug-error">{errors.slug.join(' ')}</span>{/if}
	</div>

	<div class="field">
		<label for="description">{m.tournament_description()}</label>
		<textarea
			id="description"
			name="description"
			rows="8"
			maxlength="5000"
			aria-describedby="description-hint description-error"
			aria-invalid={errors.description ? 'true' : undefined}>{values.description}</textarea
		>
		<span class="hint" id="description-hint">{m.tournament_description_hint()}</span>
		{#if errors.description}<span class="error" id="description-error"
				>{errors.description.join(' ')}</span
			>{/if}
	</div>

	<div class="row">
		<div class="field">
			<label for="startsAt">{m.tournament_starts_at()}</label>
			<DateTimeInput
				id="startsAt"
				name="startsAt"
				value={values.startsAt}
				describedby="startsAt-error"
				invalid={!!errors.startsAt}
			/>
			{#if errors.startsAt}<span class="error" id="startsAt-error">{errors.startsAt.join(' ')}</span
				>{/if}
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
				aria-describedby="participantLimit-hint participantLimit-error"
				aria-invalid={errors.participantLimit ? 'true' : undefined}
			/>
			<span class="hint" id="participantLimit-hint">{m.tournament_limit_hint()}</span>
			{#if errors.participantLimit}<span class="error" id="participantLimit-error"
					>{errors.participantLimit.join(' ')}</span
				>{/if}
		</div>
	</div>

	<button class="btn primary" type="submit">{m.tournament_save()}</button>
</form>

<section class="card game" aria-labelledby="game-title">
	<h2 id="game-title">{m.game_title()}</h2>
	{#if form?.gameSaved}
		<p class="alert success" role="status">{m.game_saved()}</p>
	{:else if form?.gameError}
		<p class="alert error" role="alert">{form.gameError}</p>
	{/if}
	<p class="muted">{m.game_hint()}</p>

	{#if data.game}
		<div class="current">
			<SteamGame game={data.game} width={230} />
			<form method="POST" action="?/clearGame" use:enhance>
				<button class="btn small danger" type="submit">{m.game_remove()}</button>
			</form>
		</div>
	{:else}
		<p class="muted">{m.game_none()}</p>
	{/if}

	{#if data.steam}
		<GamePicker
			query={data.steam.query}
			results={data.steam.results}
			searchUrl={resolve('/t/[org]/[tournament]/admin/games', params)}
		/>
	{/if}
</section>

<form method="POST" action="?/delete" class="card danger-zone" use:enhance>
	<h2>{m.tournament_delete_title()}</h2>
	<p class="muted">{m.tournament_delete_lead({ slug: data.settings.slug })}</p>
	<div class="field">
		<label for="confirm">{m.tournament_delete_confirm()}</label>
		<input
			id="confirm"
			name="confirm"
			type="text"
			autocomplete="off"
			required
			aria-describedby="confirm-error"
			aria-invalid={form?.deleteError ? 'true' : undefined}
		/>
		{#if form?.deleteError}<span class="error" id="confirm-error">{form.deleteError}</span>{/if}
	</div>
	<button class="btn danger" type="submit">{m.tournament_delete_submit()}</button>
</form>

<style lang="scss">
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1.5rem;
	}

	.game {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.5rem;

		h2 {
			font-size: 1.1rem;
			margin: 0;
		}

		p {
			margin: 0;
		}
	}

	.current {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;
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
