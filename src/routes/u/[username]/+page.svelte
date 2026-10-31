<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate, formatRecord } from '#lib/format.ts';
	import { statusLabel, statusTone } from '#lib/labels.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import TournamentList from '#lib/components/TournamentList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const memberSince = $derived(
		formatDate(data.profile.createdAt, { year: 'numeric', month: 'long' })
	);
</script>

<svelte:head>
	<title>{data.profile.displayName} · {m.app_name()}</title>
</svelte:head>

<header class="profile">
	<Avatar src={data.profile.avatarUrl} name={data.profile.displayName} size={56} />
	<div class="who">
		<h1>{data.profile.displayName}</h1>
		<p class="muted">@{data.profile.username} · {m.user_member_since({ date: memberSince })}</p>
	</div>
	{#if data.isOwn}
		<a class="btn small" href={resolve('/settings')}>{m.user_edit()}</a>
	{/if}
</header>
{#if data.profile.bio}<p class="bio">{data.profile.bio}</p>{/if}

{#snippet hiddenNote()}
	<p class="alert">
		{m.user_hidden_note()} <a href={resolve('/settings')}>{m.user_hidden_settings()}</a>
	</p>
{/snippet}

<div class="layout">
	<section class="card results" aria-labelledby="results-title">
		<h2 id="results-title">{m.user_results()}</h2>
		{#if data.isOwn && !data.visibility.results}{@render hiddenNote()}{/if}
		{#if !data.results}
			<p class="muted">{m.user_results_hidden()}</p>
		{:else if !data.results.length}
			<p class="muted">{m.user_results_empty()}</p>
		{:else}
			<!-- Where and when go under the name, so the row fits a phone with its numbers. -->
			<table>
				<thead>
					<tr>
						<th scope="col">{m.user_history_tournament()}</th>
						<th scope="col" class="num">{m.user_history_rank()}</th>
						<th scope="col" class="num">{m.standings_record()}</th>
					</tr>
				</thead>
				<tbody>
					{#each data.results as item (`${item.orgSlug}/${item.slug}`)}
						{@const params = { org: item.orgSlug, tournament: item.slug }}
						<tr>
							<td>
								<span class="event">
									<a href={resolve('/t/[org]/[tournament]', params)}>{item.name}</a>
									<span class="badge {statusTone(item.status)}">{statusLabel(item.status)}</span>
								</span>
								<span class="where muted">
									<a href={resolve('/o/[org]', { org: item.orgSlug })}>{item.orgName}</a>
									· {formatDate(item.date)} ·
									<a
										href={resolve('/t/[org]/[tournament]/matches', params)}
										aria-label={m.user_matches_of({ name: item.name })}>{m.t_matches()}</a
									>
								</span>
							</td>
							<td class="num rank" class:first={item.finalRank === 1}>
								{item.finalRank ? m.participants_rank({ rank: item.finalRank }) : '–'}
							</td>
							<td class="num">{formatRecord(item.record)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	<!-- The sheet's margin: ruled text, not boxes, as on a tournament's overview. -->
	<div class="margin">
		<section aria-labelledby="activity-title">
			<h2 id="activity-title">{m.user_activity()}</h2>
			{#if data.isOwn && !data.visibility.activity}{@render hiddenNote()}{/if}
			{#if !data.activity}
				<p class="muted">{m.user_activity_hidden()}</p>
			{:else}
				<h3>{m.user_registered()}</h3>
				<TournamentList items={data.activity.tournaments} empty={m.user_activity_empty()} />
				{#if data.activity.organizations.length}
					<h3>{m.user_organizations()}</h3>
					<ul class="rows">
						{#each data.activity.organizations as org (org.slug)}
							<li>
								<a href={resolve('/o/[org]', { org: org.slug })}>{org.name}</a>
								<span class="badge">
									{org.role === 'owner' ? m.members_role_owner() : m.members_role_admin()}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			{/if}
		</section>

		{#if data.accounts.length}
			<section aria-labelledby="accounts-title">
				<h2 id="accounts-title">{m.user_accounts()}</h2>
				<ul class="rows">
					{#each data.accounts as account (account.module)}
						<li>
							<span class="muted">{account.module}</span>
							<span class="name">{account.username}</span>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</div>

<style lang="scss">
	@use 'tokens' as *;

	.profile {
		display: flex;
		align-items: center;
		gap: 1rem;

		.who {
			flex: 1;
			min-width: 0;
		}

		h1 {
			margin: 0 0 0.15rem;
			overflow-wrap: anywhere;
		}

		p {
			margin: 0;
		}
	}

	.bio {
		max-width: 65ch;
		margin: 1rem 0 0;
		white-space: pre-line;
	}

	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2rem var(--gap);
		align-items: start;
		margin-top: 1.5rem;

		@include up($bp-md) {
			grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		}
	}

	h2 {
		margin: 0 0 0.75rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th {
		padding: 0 0 0.4rem;
		color: var(--text-muted);
		font-size: var(--fs-small);
		font-weight: 550;
		text-align: left;
		border-bottom: 1px solid var(--border);
	}

	td {
		padding: 0.6rem 0;
		vertical-align: top;
		border-bottom: 1px solid var(--rule);
	}

	tr:last-child td {
		border-bottom: 0;
	}

	.num {
		width: 4.5rem;
		padding-left: 0.75rem;
		text-align: right;
		white-space: nowrap;
	}

	// The champion's rank in ink, as the winner's line is.
	.rank.first {
		font-weight: 700;
	}

	.event {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.5rem;

		a {
			color: var(--text);
			font-weight: 600;
			text-decoration: none;

			&:hover {
				color: var(--accent-ink);
			}
		}
	}

	.where {
		display: block;
		margin-top: 0.15rem;
		font-size: var(--fs-small);

		a {
			color: inherit;
		}
	}

	.margin {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		min-width: 0;

		// Each block starts on a printed rule, like a section in the sheet's margin.
		> section {
			padding-top: 0.75rem;
			border-top: 1px solid var(--control);
		}
	}

	h3 {
		margin: 1rem 0 0.25rem;
		color: var(--text-muted);
		font-size: var(--fs-body);
		font-weight: 550;
	}

	.rows {
		list-style: none;
		margin: 0;
		padding: 0;

		li {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 1rem;
			min-height: 40px;

			& + li {
				border-top: 1px solid var(--rule);
			}
		}

		a {
			font-weight: 600;
			text-decoration: none;
		}
	}

	.alert {
		margin-bottom: 0.75rem;
	}
</style>
