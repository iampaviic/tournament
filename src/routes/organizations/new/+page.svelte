<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import OrganizationFields from '#lib/components/OrganizationFields.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	// The home page's "Start a tournament" form arrives with the name filled in.
	const values = $derived(
		form?.values ?? {
			name: page.url.searchParams.get('name')?.slice(0, 80) ?? '',
			slug: '',
			description: ''
		}
	);
</script>

<svelte:head>
	<title>{m.org_new_title()} · {m.app_name()}</title>
</svelte:head>

<div class="narrow">
	<h1>{m.org_new_title()}</h1>
	<form method="POST" class="card" use:enhance>
		<OrganizationFields {values} errors={form?.errors} suggestSlug />
		<button class="btn primary" type="submit">{m.org_create()}</button>
	</form>
</div>

<style lang="scss">
	.narrow {
		max-width: 40rem;
	}
</style>
