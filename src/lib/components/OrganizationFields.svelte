<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { slugify } from '#lib/slug.ts';

	interface Props {
		values: { name: string; slug: string; description: string };
		errors?: Partial<Record<string, string[]>>;
		/** Fill the address from the name until the user edits it. */
		suggestSlug?: boolean;
	}

	let { values, errors = {}, suggestSlug = false }: Props = $props();

	// Edited locally, and reset whenever the server sends back new values.
	let name = $derived(values.name);
	/** An empty address follows the name. */
	let customSlug = $derived(values.slug);
	const slug = $derived(customSlug || (suggestSlug ? slugify(name) : ''));
</script>

<div class="field">
	<label for="org-name">{m.org_name()}</label>
	<input
		id="org-name"
		name="name"
		type="text"
		bind:value={name}
		required
		maxlength="64"
		aria-describedby="org-name-error"
		aria-invalid={errors.name ? 'true' : undefined}
	/>
	{#if errors.name}<span class="error" id="org-name-error">{errors.name.join(' ')}</span>{/if}
</div>

<div class="field">
	<label for="org-slug">{m.org_slug()}</label>
	<input
		id="org-slug"
		name="slug"
		type="text"
		value={slug}
		oninput={(event) => (customSlug = event.currentTarget.value)}
		required
		maxlength="40"
		aria-describedby="org-slug-hint org-slug-error"
		aria-invalid={errors.slug ? 'true' : undefined}
	/>
	<span class="hint" id="org-slug-hint">{m.org_slug_hint({ slug: slug || '…' })}</span>
	{#if errors.slug}<span class="error" id="org-slug-error">{errors.slug.join(' ')}</span>{/if}
</div>

<div class="field">
	<label for="org-description">{m.org_description()}</label>
	<textarea
		id="org-description"
		name="description"
		rows="5"
		maxlength="2000"
		aria-describedby="org-description-hint org-description-error"
		aria-invalid={errors.description ? 'true' : undefined}>{values.description}</textarea
	>
	<span class="hint" id="org-description-hint">{m.org_description_hint()}</span>
	{#if errors.description}<span class="error" id="org-description-error"
			>{errors.description.join(' ')}</span
		>{/if}
</div>
