<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import TournamentList from '#lib/components/TournamentList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.org.name} · {m.app_name()}</title>
</svelte:head>

<header class="header">
	<div>
		<h1>{data.org.name}</h1>
		{#if data.org.description}<p class="description">{data.org.description}</p>{/if}
	</div>
	{#if data.isMember}
		<a class="btn small" href={resolve('/o/[org]/admin', { org: data.org.slug })}>
			{m.org_manage()}
		</a>
	{/if}
</header>

<section class="card">
	<h2>{m.org_upcoming_title()}</h2>
	<TournamentList items={data.current} empty={m.org_upcoming_empty()} />
</section>

<section class="card">
	<h2>{m.org_archive_title()}</h2>
	<TournamentList items={data.archive} empty={m.org_archive_empty()} />
</section>

<style lang="scss">
	@use 'tokens' as *;

	section + section {
		margin-top: var(--gap);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;

		h1 {
			font-size: 1.5rem;

			@include up($bp-sm) {
				font-size: var(--fs-title);
			}
		}
	}

	.description {
		margin: 0;
		max-width: 65ch;
		color: var(--text-muted);
		white-space: pre-line;
	}

	h2 {
		font-size: var(--fs-section);
	}
</style>
