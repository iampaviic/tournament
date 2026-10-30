<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import OrganizationFields from '#lib/components/OrganizationFields.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived(form?.values ?? data.settings);
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
		<p class="alert success" role="status">{m.org_saved()}</p>
	{/if}
	<OrganizationFields {values} errors={form?.errors} />
	<button class="btn primary" type="submit">{m.org_save()}</button>
</form>

{#if data.role === 'owner'}
	<form method="POST" action="?/delete" class="card danger-zone" use:enhance>
		<h2>{m.org_delete_title()}</h2>
		<p class="muted">{m.org_delete_lead({ slug: data.settings.slug })}</p>
		<div class="field">
			<label for="confirm">{m.org_delete_confirm()}</label>
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
		<button class="btn danger" type="submit">{m.org_delete_submit()}</button>
	</form>
{/if}

<style lang="scss">
	.danger-zone {
		margin-top: 1.5rem;
		border-color: var(--danger);

		h2 {
			font-size: var(--fs-section);
			color: var(--danger);
		}
	}
</style>
