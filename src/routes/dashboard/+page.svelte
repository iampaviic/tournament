<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.dashboard_title()} · {m.app_name()}</title>
</svelte:head>

<h1>{m.dashboard_welcome({ name: data.user!.displayName })}</h1>

{#if !data.trusted}
	<p class="alert warning">{m.dashboard_untrusted({ module: data.sessionModule })}</p>
{/if}

<div class="grid">
	<section class="card">
		<h2>{m.dashboard_tournaments_title()}</h2>
		<p class="muted">{m.dashboard_tournaments_empty()}</p>
	</section>
	<section class="card">
		<h2>{m.dashboard_orgs_title()}</h2>
		<p class="muted">{m.dashboard_orgs_empty()}</p>
	</section>
</div>

<style lang="scss">
	@use 'tokens' as *;

	.grid {
		display: grid;
		gap: 1rem;
		margin-top: 1.5rem;

		@include up($bp-md) {
			grid-template-columns: 2fr 1fr;
		}
	}

	h2 {
		font-size: 1.15rem;
	}
</style>
