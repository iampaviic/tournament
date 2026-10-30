<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import TournamentList from '#lib/components/TournamentList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const roleLabel = (role: 'owner' | 'admin') =>
		role === 'owner' ? m.members_role_owner() : m.members_role_admin();
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
		<h2 class="spaced">{m.dashboard_tournaments_title()}</h2>
		<TournamentList items={data.tournaments} empty={m.dashboard_tournaments_empty()} />
	</section>
	<section class="card">
		<div class="heading">
			<h2>{m.dashboard_orgs_title()}</h2>
			{#if data.trusted}
				<a class="btn small" href={resolve('/organizations/new')}>{m.dashboard_new_org()}</a>
			{/if}
		</div>
		{#if data.organizations.length}
			<ul class="orgs">
				{#each data.organizations as org (org.slug)}
					<li>
						<a href={resolve('/o/[org]/admin', { org: org.slug })}>{org.name}</a>
						<span class="badge">{roleLabel(org.role)}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">{m.dashboard_orgs_empty()}</p>
		{/if}
		{#if !data.trusted}
			<p class="muted small">{m.dashboard_orgs_untrusted()}</p>
		{/if}
	</section>
</div>

<style lang="scss">
	@use 'tokens' as *;

	.grid {
		display: grid;
		gap: var(--gap);
		margin-top: 1.5rem;
		align-items: stretch;

		@include up($bp-md) {
			grid-template-columns: 2fr 1fr;
		}
	}

	h2 {
		margin: 0;
	}

	.spaced {
		margin-bottom: 0.75rem;
	}

	.heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.orgs {
		list-style: none;
		margin: 0;
		padding: 0;

		li {
			display: flex;
			justify-content: space-between;
			align-items: center;
			min-height: 44px;

			& + li {
				border-top: 1px solid var(--rule);
			}
		}

		a {
			font-weight: 600;
			text-decoration: none;
		}
	}

	.small {
		font-size: var(--fs-small);
		margin-bottom: 0;
	}
</style>
