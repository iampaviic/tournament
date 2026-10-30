<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form?.values ?? data.profile);
	const errors: Partial<Record<string, string[]>> = $derived(form?.errors ?? {});
</script>

<form
	method="POST"
	class="card"
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
>
	{#if form?.saved}
		<p class="alert success" role="status">{m.profile_saved()}</p>
	{/if}

	<div class="field">
		<label for="username">{m.profile_username()}</label>
		<input
			id="username"
			name="username"
			type="text"
			value={values.username}
			required
			aria-describedby="username-hint username-error"
			aria-invalid={errors.username ? 'true' : undefined}
		/>
		<span class="hint" id="username-hint">{m.profile_username_hint()}</span>
		{#if errors.username}<span class="error" id="username-error">{errors.username.join(' ')}</span
			>{/if}
	</div>

	<div class="field">
		<label for="displayName">{m.profile_display_name()}</label>
		<input
			id="displayName"
			name="displayName"
			type="text"
			value={values.displayName}
			required
			aria-describedby="displayName-error"
			aria-invalid={errors.displayName ? 'true' : undefined}
		/>
		{#if errors.displayName}<span class="error" id="displayName-error"
				>{errors.displayName.join(' ')}</span
			>{/if}
	</div>

	<div class="field">
		<label for="bio">{m.profile_bio()}</label>
		<textarea
			id="bio"
			name="bio"
			rows="4"
			aria-describedby="bio-error"
			aria-invalid={errors.bio ? 'true' : undefined}>{values.bio}</textarea
		>
		{#if errors.bio}<span class="error" id="bio-error">{errors.bio.join(' ')}</span>{/if}
	</div>

	<label class="checkbox">
		<input type="checkbox" name="showResults" checked={values.showResults} />
		{m.profile_show_results()}
	</label>
	<label class="checkbox">
		<input type="checkbox" name="showActivity" checked={values.showActivity} />
		{m.profile_show_activity()}
	</label>

	<button class="btn primary" type="submit">{m.profile_save()}</button>
</form>
