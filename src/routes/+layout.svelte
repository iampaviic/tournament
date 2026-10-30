<script lang="ts">
	import '#lib/styles/global.scss';
	import type { ResolvedPathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';
	import favicon from '#lib/assets/favicon.svg';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_name()}</title>
</svelte:head>

<header>
	<div class="container bar">
		<a class="brand" href={resolve('/')}>{m.app_name()}</a>
		<nav>
			{#if data.user}
				<a href={resolve('/dashboard')}>{m.nav_dashboard()}</a>
				<a class="me" href={resolve('/u/[username]', { username: data.user.username })}>
					<Avatar src={data.user.avatarUrl} name={data.user.displayName} size={28} />
					<span>{data.user.displayName}</span>
				</a>
				<a href={resolve('/settings')}>{m.nav_settings()}</a>
				<form method="POST" action={resolve('/auth/logout')}>
					<button class="btn small" type="submit">{m.nav_logout()}</button>
				</form>
			{:else}
				<a class="btn small primary" href={resolve('/login')}>{m.nav_login()}</a>
			{/if}
		</nav>
	</div>
</header>

<main class="container">
	{@render children()}
</main>

<div style="display:none">
	{#each locales as locale (locale)}
		<!-- The current pathname already includes the base path. -->
		<a href={localizeHref(page.url.pathname, { locale }) as ResolvedPathname}>{locale}</a>
	{/each}
</div>

<style lang="scss">
	@use 'tokens' as *;

	header {
		background: var(--surface);
		border-bottom: 1px solid var(--border);
		margin-bottom: 2rem;
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 3.5rem;
	}

	.brand {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		white-space: nowrap;

		@include up($bp-sm) {
			gap: 1rem;
		}

		a:not(.btn) {
			color: var(--text-muted);
			text-decoration: none;

			&:hover {
				color: var(--text);
			}
		}
	}

	.me {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		span {
			display: none;

			@include up($bp-sm) {
				display: inline;
			}
		}
	}

	main {
		padding-bottom: 3rem;
	}
</style>
