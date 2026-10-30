<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const tabs = $derived([
		{
			route: '/o/[org]/admin',
			href: resolve('/o/[org]/admin', { org: data.org.slug }),
			label: m.org_admin_settings
		},
		{
			route: '/o/[org]/admin/members',
			href: resolve('/o/[org]/admin/members', { org: data.org.slug }),
			label: m.org_admin_members
		},
		{
			route: '/o/[org]/admin/api-keys',
			href: resolve('/o/[org]/admin/api-keys', { org: data.org.slug }),
			label: m.org_admin_api_keys
		}
	]);
</script>

<svelte:head>
	<title>{data.org.name} · {m.app_name()}</title>
</svelte:head>

<div class="title">
	<h1>{data.org.name}</h1>
	<a href={resolve('/o/[org]', { org: data.org.slug })}>{m.org_admin_view_public()}</a>
</div>

<nav class="tabs" aria-label={m.org_admin_nav()}>
	{#each tabs as tab (tab.route)}
		<a href={tab.href} aria-current={page.route.id === tab.route ? 'page' : undefined}>
			{tab.label()}
		</a>
	{/each}
</nav>

{@render children()}

<style lang="scss">
	.title {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 1rem;

		h1 {
			margin: 0;
		}
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		margin: 1rem 0 1.5rem;
		border-bottom: 1px solid var(--border);
		overflow-x: auto;

		a {
			padding: 0.6rem 0.9rem;
			color: var(--text-muted);
			text-decoration: none;
			border-bottom: 2px solid transparent;
			margin-bottom: -1px;
			white-space: nowrap;

			&:hover {
				color: var(--text);
			}

			&[aria-current='page'] {
				color: var(--text);
				font-weight: 600;
				border-bottom-color: var(--accent);
			}
		}
	}
</style>
