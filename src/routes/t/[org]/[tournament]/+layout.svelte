<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/format.ts';
	import { statusLabel, statusTone } from '#lib/labels.ts';
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
	// Back goes to wherever the visitor came from before this tournament's pages (a dashboard, a
	// profile, the organization); arriving directly, it goes to the organization's page. Moving
	// between this tournament's own tabs and rooms doesn't count as where they came from.
	const base = $derived(resolve('/t/[org]/[tournament]', params));
	let previous = $state<string | null>(null);
	afterNavigate(({ from }) => {
		const path = from?.url.pathname;
		if (path && path !== base && !path.startsWith(`${base}/`)) {
			previous = from!.url.pathname + from!.url.search;
		}
	});
	const orgHref = $derived(resolve('/o/[org]', { org: data.org.slug }));

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
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a path this app served -->
	<a class="back" href={previous ?? orgHref}>
		<Icon name="back" />
		{previous ? m.t_back() : m.t_back_to({ name: data.org.name })}
	</a>

	<header class="tournament">
		<!-- The game's own art as the stage behind the title, faded into the page. -->
		{#if data.tournament.game?.headerImage}
			<img class="stage" src={data.tournament.game.headerImage} alt="" aria-hidden="true" />
		{/if}
		<div>
			<a class="muted org" href={resolve('/o/[org]', { org: data.org.slug })}>{data.org.name}</a>
			<h1>{data.tournament.name}</h1>
			<p class="muted meta">
				<span class="badge {statusTone(data.tournament.status)}"
					>{statusLabel(data.tournament.status)}</span
				>
				{#if data.tournament.startsAt}
					<span>{m.t_starts({ date: formatDateTime(data.tournament.startsAt) })}</span>
				{/if}
				<!-- The game is a fact about the event, so it sits with the others, not above them. -->
				{#if data.tournament.game}<SteamGame game={data.tournament.game} width={56} />{/if}
			</p>
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
	@use 'tokens' as *;

	// Plain enough to read as navigation, with the same press as every control.
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 32px;
		margin: -0.75rem 0 0.75rem -0.5rem;
		padding: 0 0.6rem 0 0.4rem;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		font-weight: 600;
		text-decoration: none;
		transition:
			color var(--t-hover) ease,
			background-color var(--t-hover) ease;

		&:hover {
			background: var(--surface-2);
			color: var(--text);
		}

		@media (pointer: coarse) {
			min-height: 44px;
		}
	}

	.tournament {
		position: relative;
		isolation: isolate;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;

		h1 {
			margin: 0.15rem 0 0.5rem;
			font-size: 1.625rem;

			@include up($bp-sm) {
				font-size: clamp(2rem, 4vw, 2.75rem);
			}
		}
	}

	.stage {
		position: absolute;
		z-index: -1;
		top: -2rem;
		right: 0;
		width: min(36rem, 60%);
		height: calc(100% + 2rem);
		object-fit: cover;
		opacity: 0.38;
		// Faded into the page on the left and at the foot, so only the art's middle shows.
		mask-image:
			linear-gradient(to right, transparent, #000 60%),
			linear-gradient(to bottom, #000 45%, transparent);
		mask-composite: intersect;
		pointer-events: none;

		@media (max-width: 639.98px) {
			display: none;
		}
	}

	.tournament {
		.org {
			color: var(--text-muted);
			font-weight: 550;
			text-decoration: none;

			&:hover {
				color: var(--text);
			}
		}

		.meta {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem 0.75rem;
			margin: 0;
		}
	}
</style>
