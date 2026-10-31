<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { statusLabel, statusTone } from '#lib/labels.ts';
	import BackLink from '#lib/components/BackLink.svelte';
	import type { SubmitFunction } from '$app/forms';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const params = $derived({ org: data.org.slug, tournament: data.tournament.slug });
	const tabs = $derived([
		{
			route: '/t/[org]/[tournament]/admin',
			href: resolve('/t/[org]/[tournament]/admin', params),
			label: m.tadmin_general
		},
		{
			route: '/t/[org]/[tournament]/admin/requirements',
			href: resolve('/t/[org]/[tournament]/admin/requirements', params),
			label: m.tadmin_requirements
		},
		{
			route: '/t/[org]/[tournament]/admin/structure',
			href: resolve('/t/[org]/[tournament]/admin/structure', params),
			label: m.tadmin_structure
		},
		{
			route: '/t/[org]/[tournament]/admin/theme',
			href: resolve('/t/[org]/[tournament]/admin/theme', params),
			label: m.tadmin_theme
		},
		{
			route: '/t/[org]/[tournament]/admin/participants',
			href: resolve('/t/[org]/[tournament]/admin/participants', params),
			label: m.tadmin_participants
		},
		{
			route: '/t/[org]/[tournament]/admin/matches',
			href: resolve('/t/[org]/[tournament]/admin/matches', params),
			label: m.tadmin_matches
		}
	]);
	const current = $derived(tabs.find((tab) => tab.route === page.route.id));

	const status = $derived(data.tournament.status);
	const description = $derived(
		status === 'running' && data.nextStageReady
			? m.lifecycle_next_stage_ready()
			: {
					draft: m.lifecycle_draft,
					registration: m.lifecycle_registration,
					check_in: m.lifecycle_check_in,
					running: m.lifecycle_running,
					completed: m.lifecycle_completed
				}[status]()
	);
	type Step = { to: string; label: string; primary?: boolean };
	const steps: Step[] = $derived(
		{
			draft: [{ to: 'registration', label: m.lifecycle_open_registration(), primary: true }],
			registration: [
				{ to: 'running', label: m.lifecycle_start(), primary: true },
				{ to: 'check_in', label: m.lifecycle_start_check_in() },
				{ to: 'draft', label: m.lifecycle_back_to_draft() }
			],
			check_in: [
				{ to: 'running', label: m.lifecycle_start(), primary: true },
				{ to: 'registration', label: m.lifecycle_reopen_registration() }
			],
			running: data.nextStageReady
				? [{ to: 'next_stage', label: m.lifecycle_start_next_stage(), primary: true }]
				: [],
			completed: []
		}[status]
	);
	const lifecycleAction = $derived(`${resolve('/t/[org]/[tournament]/admin', params)}?/lifecycle`);
	let lifecycleError = $state<string | null>(null);

	/** The action lives on the General page; handle its result here so the admin stays on this tab. */
	const lifecycle: SubmitFunction =
		() =>
		async ({ result }) => {
			if (result.type === 'failure') {
				lifecycleError = String(result.data?.lifecycleError ?? '') || null;
			} else if (result.type === 'success') {
				lifecycleError = null;
				await invalidateAll();
			} else {
				await applyAction(result);
			}
		};
</script>

<svelte:head>
	<title>{current ? `${current.label()} · ` : ''}{data.tournament.name} · {m.app_name()}</title>
</svelte:head>

<!-- Leaves the tournament's admin: back to where you came from, or to the organization's list. -->
<BackLink
	within={resolve('/t/[org]/[tournament]/admin', params)}
	fallback={resolve('/o/[org]/admin/tournaments', { org: data.org.slug })}
	fallbackName={data.org.name}
/>

<div class="title">
	<div>
		<a class="muted org" href={resolve('/o/[org]/admin/tournaments', { org: data.org.slug })}>
			{data.org.name}
		</a>
		<h1>{data.tournament.name}</h1>
	</div>
	<a href={resolve('/t/[org]/[tournament]', params)}>{m.tadmin_view_public()}</a>
</div>

<section class="card lifecycle">
	<div>
		<span class="badge {statusTone(status)}">{statusLabel(status)}</span>
		<p>{description}</p>
		{#if lifecycleError}<p class="error" role="alert">{lifecycleError}</p>{/if}
	</div>
	{#if steps.length}
		<div class="steps">
			{#each steps as step (step.to)}
				<form method="POST" action={lifecycleAction} use:enhance={lifecycle}>
					<input type="hidden" name="to" value={step.to} />
					<button class="btn" class:primary={step.primary} type="submit">{step.label}</button>
				</form>
			{/each}
		</div>
	{/if}
</section>

<nav class="tabs" aria-label={m.tadmin_nav()}>
	{#each tabs as tab (tab.route)}
		<a href={tab.href} aria-current={page.route.id === tab.route ? 'page' : undefined}>
			{tab.label()}
		</a>
	{/each}
</nav>

{@render children()}

<style lang="scss">
	@use 'tokens' as *;

	.title {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-end;
		gap: 0.5rem 1rem;
		margin-bottom: 1rem;

		h1 {
			margin: 0.15rem 0 0;
			font-size: 1.5rem;

			@include up($bp-sm) {
				font-size: var(--fs-title);
			}
		}

		.org {
			color: var(--text-muted);
			font-weight: 550;
			text-decoration: none;

			&:hover {
				color: var(--text);
			}
		}
	}

	.lifecycle {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;

		p {
			margin: 0.4rem 0 0;
		}

		.error {
			color: var(--danger);
		}

		@include up($bp-sm) {
			flex-wrap: nowrap;
		}
	}

	.steps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
