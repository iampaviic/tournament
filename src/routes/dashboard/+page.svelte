<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import TournamentList from '#lib/components/TournamentList.svelte';
	import { statusLabel, statusTone } from '#lib/labels.ts';
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

<!-- The organizer's desk comes first: what needs their pen. -->
{#if data.running.length}
	<section class="card desk" aria-labelledby="desk-title">
		<h2 id="desk-title">{m.dashboard_run_title()}</h2>
		<ul>
			{#each data.running as t (t.id)}
				{@const params = { org: t.orgSlug, tournament: t.slug }}
				<li>
					<div class="what">
						<a class="event" href={resolve('/t/[org]/[tournament]/admin', params)}>{t.name}</a>
						<span class="muted">
							{t.detail}
							<span class="badge {statusTone(t.status)}">{statusLabel(t.status)}</span>
						</span>
					</div>
					{#if t.waiting}
						<div class="act">
							<span class="waiting">{m.dashboard_waiting({ count: t.waiting })}</span>
							<a class="btn primary" href={resolve('/t/[org]/[tournament]/admin/matches', params)}>
								{m.dashboard_open_queue()}
							</a>
						</div>
					{:else}
						<a class="btn" href={resolve('/t/[org]/[tournament]/admin', params)}>{m.t_manage()}</a>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
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

	// A greeting, not the screen's subject: the desk below is.
	h1 {
		font-size: var(--fs-section);
		font-weight: 600;
		letter-spacing: 0;
	}

	.desk {
		margin-top: 1.5rem;
		padding-block: 1rem 0.5rem;

		ul {
			list-style: none;
			margin: 0;
			padding: 0;
		}

		li {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: 0.75rem 1.5rem;
			padding-block: 1rem;

			& + li {
				border-top: 1px solid var(--rule);
			}
		}
	}

	.what {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;

		.muted {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem;
		}
	}

	.event {
		color: var(--text);
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		text-decoration: none;

		&:hover {
			color: var(--accent);
		}
	}

	.act {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1rem;
	}

	// How many matches wait on the organizer, in their red pen.
	.waiting {
		color: var(--danger);
		font-weight: 600;
	}

	.grid {
		display: grid;
		gap: var(--gap);
		margin-top: var(--gap);
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
