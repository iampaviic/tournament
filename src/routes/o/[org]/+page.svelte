<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.org.name} · {m.app_name()}</title>
</svelte:head>

<section class="card header">
	<div>
		<h1>{data.org.name}</h1>
		{#if data.org.description}<p class="description">{data.org.description}</p>{/if}
	</div>
	{#if data.isMember}
		<a class="btn small" href={resolve('/o/[org]/admin', { org: data.org.slug })}>
			{m.org_manage()}
		</a>
	{/if}
</section>

<section class="card">
	<h2>{m.org_upcoming_title()}</h2>
	<p class="muted">{m.org_upcoming_empty()}</p>
</section>

<section class="card">
	<h2>{m.org_archive_title()}</h2>
	<p class="muted">{m.org_archive_empty()}</p>
</section>

<style lang="scss">
	section + section {
		margin-top: 1rem;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.description {
		margin: 0;
		white-space: pre-line;
	}

	h2 {
		font-size: 1.15rem;
	}
</style>
