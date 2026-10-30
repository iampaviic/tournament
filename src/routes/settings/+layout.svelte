<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const tabs = [
		{ route: '/settings', href: resolve('/settings'), label: m.settings_nav_profile },
		{
			route: '/settings/identities',
			href: resolve('/settings/identities'),
			label: m.settings_nav_identities
		}
	];
</script>

<svelte:head>
	<title>{m.settings_title()} · {m.app_name()}</title>
</svelte:head>

<h1>{m.settings_title()}</h1>

<div class="layout">
	<nav>
		{#each tabs as tab (tab.route)}
			<a href={tab.href} aria-current={page.route.id === tab.route ? 'page' : undefined}>
				{tab.label()}
			</a>
		{/each}
	</nav>
	<div class="content">
		{@render children()}
	</div>
</div>

<style lang="scss">
	@use 'tokens' as *;

	.layout {
		display: grid;
		gap: 1.5rem;

		@include up($bp-md) {
			grid-template-columns: 14rem 1fr;
		}
	}

	nav {
		display: flex;
		gap: 0.25rem;

		@include up($bp-md) {
			flex-direction: column;
		}

		a {
			padding: 0.5rem 0.75rem;
			border-radius: var(--radius-sm);
			color: var(--text-muted);
			text-decoration: none;

			&:hover {
				background: var(--surface-2);
			}

			&[aria-current='page'] {
				background: var(--surface-2);
				color: var(--text);
				font-weight: 600;
			}
		}
	}

	.content {
		min-width: 0;
	}
</style>
