<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const memberSince = $derived(
		data.profile.createdAt.toLocaleDateString(getLocale(), { year: 'numeric', month: 'long' })
	);
</script>

<svelte:head>
	<title>{data.profile.displayName} · {m.app_name()}</title>
</svelte:head>

<section class="card header">
	<Avatar src={data.profile.avatarUrl} name={data.profile.displayName} size={72} />
	<div class="info">
		<h1>{data.profile.displayName}</h1>
		<p class="muted">@{data.profile.username} · {m.user_member_since({ date: memberSince })}</p>
		{#if data.profile.bio}<p class="bio">{data.profile.bio}</p>{/if}
	</div>
	{#if data.isOwn}
		<a class="btn small" href={resolve('/settings')}>{m.user_edit()}</a>
	{/if}
</section>

<div class="grid">
	<section class="card">
		<h2>{m.user_results()}</h2>
		{#if data.profile.showResults || data.isOwn}
			<p class="muted">{m.user_results_empty()}</p>
		{:else}
			<p class="muted">{m.user_results_hidden()}</p>
		{/if}
	</section>

	{#if data.accounts.length}
		<section class="card">
			<h2>{m.user_accounts()}</h2>
			<ul>
				{#each data.accounts as account (account.module)}
					<li><span class="muted">{account.module}</span> {account.username}</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style lang="scss">
	@use 'tokens' as *;

	.header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 1.25rem;
	}

	.info {
		flex: 1;
		min-width: 12rem;

		h1 {
			margin-bottom: 0.15rem;
		}

		p {
			margin: 0;
		}
	}

	.bio {
		margin-top: 0.75rem !important;
		white-space: pre-line;
	}

	.grid {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;

		@include up($bp-md) {
			grid-template-columns: 2fr 1fr;
		}
	}

	h2 {
		font-size: 1.15rem;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	li span {
		display: inline-block;
		min-width: 5rem;
	}
</style>
