<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/format.ts';
	import { statusLabel } from '#lib/labels.ts';
	import SteamGame from '#lib/components/SteamGame.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const params = $derived({ org: data.org.slug, tournament: data.tournament.slug });
	const isAdmin = $derived(page.route.id?.startsWith('/t/[org]/[tournament]/admin') ?? false);
	const tabs = $derived([
		{
			route: '/t/[org]/[tournament]',
			href: resolve('/t/[org]/[tournament]', params),
			label: m.t_overview
		},
		{
			route: '/t/[org]/[tournament]/bracket',
			href: resolve('/t/[org]/[tournament]/bracket', params),
			label: m.t_bracket
		},
		{
			route: '/t/[org]/[tournament]/matches',
			href: resolve('/t/[org]/[tournament]/matches', params),
			label: m.t_matches
		}
	]);
	/** The Overview keeps the tournament's name as its title. */
	const section = $derived(
		tabs.find((tab) => tab.route === page.route.id && tab.route !== '/t/[org]/[tournament]')
	);
</script>

<svelte:head>
	{#if !isAdmin}<title
			>{section ? `${section.label()} · ` : ''}{data.tournament.name} · {m.app_name()}</title
		>{/if}
</svelte:head>

{#if isAdmin}
	{@render children()}
{:else}
	<header class="tournament">
		<div>
			<a class="muted org" href={resolve('/o/[org]', { org: data.org.slug })}>{data.org.name}</a>
			<h1>{data.tournament.name}</h1>
			<p class="muted meta">
				<span class="badge">{statusLabel(data.tournament.status)}</span>
				{#if data.tournament.startsAt}
					{m.t_starts({
						date: formatDateTime(data.tournament.startsAt)
					})}
				{/if}
			</p>
			{#if data.tournament.game}
				<div class="game"><SteamGame game={data.tournament.game} width={184} /></div>
			{/if}
		</div>
		{#if data.isMember}
			<a class="btn small" href={resolve('/t/[org]/[tournament]/admin', params)}>{m.t_manage()}</a>
		{/if}
	</header>

	<nav class="tabs" aria-label={m.t_nav()}>
		{#each tabs as tab (tab.route)}
			<a href={tab.href} aria-current={page.route.id === tab.route ? 'page' : undefined}>
				{tab.label()}
			</a>
		{/each}
	</nav>

	{@render children()}
{/if}

<style lang="scss">
	.tournament {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;

		h1 {
			margin: 0.1rem 0 0.4rem;
		}

		.org {
			text-decoration: none;
			font-size: 0.9rem;
		}

		.meta {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			margin: 0;
		}

		.game {
			margin-top: 0.75rem;
		}
	}
</style>
