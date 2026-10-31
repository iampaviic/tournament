<script lang="ts">
	import '@fontsource-variable/onest/wght.css';
	import '@fontsource/dela-gothic-one/latin-400.css';
	import '@fontsource/dela-gothic-one/latin-ext-400.css';
	import '#lib/styles/global.scss';
	import type { ResolvedPathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';
	import favicon from '#lib/assets/favicon.svg';
	import Avatar from '#lib/components/Avatar.svelte';
	import Mark from '#lib/components/Mark.svelte';
	import ThemeSwitch from '#lib/components/ThemeSwitch.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_name()}</title>
</svelte:head>

<a class="skip-link" href="#main">{m.skip_to_content()}</a>

<header>
	<div class="container bar">
		<a class="brand" href={resolve('/')}>
			<Mark />
			<span>{m.app_name()}</span>
		</a>
		<nav aria-label={m.nav_main()}>
			{#if data.user}
				<a href={resolve('/dashboard')}>{m.nav_dashboard()}</a>
				<a href={resolve('/settings')}>{m.nav_settings()}</a>
				<a class="me" href={resolve('/u/[username]', { username: data.user.username })}>
					<Avatar src={data.user.avatarUrl} name={data.user.displayName} size={24} />
					<span>{data.user.displayName}</span>
				</a>
				<form method="POST" action={resolve('/auth/logout')}>
					<button class="btn small" type="submit">{m.nav_logout()}</button>
				</form>
			{:else}
				<a class="btn small primary" href={resolve('/login')}>{m.nav_login()}</a>
			{/if}
		</nav>
	</div>
</header>

<main id="main" class="container" tabindex="-1">
	{@render children()}
</main>

<footer>
	<div class="container close">
		<a class="brand" href={resolve('/')}>
			<Mark size={16} />
			<span>{m.app_name()}</span>
		</a>
		<p class="muted">{m.footer_tagline()}</p>
		<a href={resolve('/docs/api')}>{m.footer_api_docs()}</a>
		<a href="https://github.com/iampaviic/tournament">{m.footer_source()}</a>
		<ThemeSwitch />
	</div>
</footer>

<div style="display:none">
	{#each locales as locale (locale)}
		<!-- The current pathname already includes the base path. -->
		<a href={localizeHref(page.url.pathname, { locale }) as ResolvedPathname}>{locale}</a>
	{/each}
</div>

<style lang="scss">
	@use 'tokens' as *;

	header {
		margin-bottom: 2rem;
		border-bottom: 1px solid var(--border);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 56px;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		min-width: 0;
		color: var(--text);
		font-family: var(--font-display);
		font-size: 0.875rem;
		letter-spacing: 0.01em;
		text-decoration: none;

		@include up($bp-sm) {
			font-size: 1rem;
		}

		span {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	nav {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		white-space: nowrap;
		font-weight: 600;

		> a:not(.btn) {
			display: none;
			color: var(--text-muted);
			text-decoration: none;

			&:hover {
				color: var(--text);
			}

			@include up($bp-sm) {
				display: inline;
			}
		}

		> a.me {
			display: inline-flex;
			align-items: center;
			gap: 0.45rem;
			color: var(--text);

			span {
				display: none;

				@include up($bp-sm) {
					display: inline;
				}
			}
		}
	}

	main {
		flex: 1 0 auto;
		padding-bottom: 4rem;
	}

	// On a short page the footer sits at the window's foot.
	footer {
		padding: 1.5rem 0 2.5rem;
		border-top: 1px solid var(--border);
	}

	.close {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1.5rem;

		.brand {
			font-size: 0.9375rem;
		}

		p {
			flex: 1;
			margin: 0;
			min-width: 14rem;
		}
	}
</style>
