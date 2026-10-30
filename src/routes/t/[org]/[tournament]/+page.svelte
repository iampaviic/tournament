<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const status = $derived(data.tournament.status);
	const here = $derived(page.url.pathname);
	const unmet = $derived(data.requirements.some((r) => r.status !== 'ok'));
	const ranked = $derived(data.participants.some((p) => p.finalRank !== null));
	const participants = $derived(
		ranked
			? data.participants.toSorted((a, b) => (a.finalRank ?? Infinity) - (b.finalRank ?? Infinity))
			: data.participants
	);
	const linkHref = (moduleId: string) =>
		`/auth/${moduleId}/login?intent=link&next=${encodeURIComponent(here)}`;
</script>

<div class="layout">
	{#if data.description}
		<section class="card description">
			<p>{data.description}</p>
		</section>
	{/if}

	<aside class="card registration">
		{#if form?.error}<p class="alert error" role="alert">{form.error}</p>{/if}

		{#if data.me}
			{#if data.me.finalRank}
				<p><strong>{m.t_your_rank({ rank: data.me.finalRank })}</strong></p>
			{:else if status === 'running'}
				<p>{m.t_playing()}</p>
			{:else if status === 'check_in' && !data.me.checkedIn}
				<p>{m.t_check_in_prompt()}</p>
				<form method="POST" action="?/checkIn" use:enhance>
					<button class="btn primary" type="submit">{m.t_check_in()}</button>
				</form>
			{:else}
				<p>{data.me.checkedIn ? m.t_checked_in() : m.t_registered()}</p>
			{/if}
			{#if status === 'registration' || status === 'check_in'}
				<form method="POST" action="?/leave" use:enhance>
					<button class="btn small danger" type="submit">{m.t_leave()}</button>
				</form>
			{/if}
		{:else if status === 'registration'}
			{#if data.requirements.length}
				<p>{m.t_requirements()}</p>
				<ul class="requirements">
					{#each data.requirements as requirement (requirement.moduleId)}
						<li class:ok={requirement.status === 'ok'}>
							{#if requirement.status === 'ok'}
								✓ {m.t_requirement_ok({ module: requirement.moduleName })}
							{:else if requirement.status === 'ineligible'}
								✗ {requirement.reason}
							{:else}
								✗ {m.t_requirement_missing({ module: requirement.moduleName })}
								{#if data.user && requirement.status === 'missing'}
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- server endpoint that redirects to the provider -->
									<a class="btn small" href={linkHref(requirement.moduleId)} data-sveltekit-reload>
										{m.t_link()}
									</a>
								{/if}
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			{#if !data.user}
				<a class="btn primary" href={resolve(`/login?next=${encodeURIComponent(here)}`)}>
					{m.t_sign_in_to_register()}
				</a>
			{:else if data.full}
				<p class="muted">{m.t_full()}</p>
			{:else}
				<form method="POST" action="?/register" use:enhance>
					<button class="btn primary" type="submit" disabled={unmet}>{m.t_register()}</button>
				</form>
			{/if}
		{:else if status === 'draft'}
			<p class="muted">{m.t_not_open()}</p>
		{:else}
			<p class="muted">{m.t_registration_closed()}</p>
		{/if}
	</aside>

	<section class="card participants">
		<h2>{m.t_participants({ count: data.participants.length })}</h2>
		{#if participants.length}
			<ol>
				{#each participants as participant (participant.id)}
					<li>
						{#if ranked}<span class="rank">{participant.finalRank ?? '–'}</span>{/if}
						<Avatar src={participant.avatarUrl} name={participant.displayName} size={28} />
						<a href={resolve('/u/[username]', { username: participant.username })}>
							{participant.displayName}
						</a>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="muted">{m.t_no_participants()}</p>
		{/if}
	</section>
</div>

<style lang="scss">
	@use 'tokens' as *;

	.layout {
		display: grid;
		gap: 1rem;
		align-items: start;

		@include up($bp-md) {
			grid-template-columns: 2fr 1fr;

			.registration {
				grid-column: 2;
				grid-row: 1;
			}
		}
	}

	.description p {
		margin: 0;
		white-space: pre-line;
	}

	.registration {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: flex-start;

		p {
			margin: 0;
		}
	}

	.requirements {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;

		li {
			color: var(--danger);
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem;

			&.ok {
				color: var(--success);
			}
		}
	}

	.participants {
		h2 {
			font-size: 1.1rem;
		}

		ol {
			list-style: none;
			margin: 0;
			padding: 0;
			columns: 14rem;
		}

		li {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.3rem 0;
			break-inside: avoid;
		}

		a {
			color: var(--text);
			text-decoration: none;
		}

		.rank {
			width: 1.75rem;
			text-align: right;
			color: var(--text-muted);
			font-variant-numeric: tabular-nums;
		}
	}
</style>
