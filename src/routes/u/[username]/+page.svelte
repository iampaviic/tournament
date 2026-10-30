<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate, formatRecord } from '#lib/format.ts';
	import { statusLabel } from '#lib/labels.ts';
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

{#snippet hiddenNote()}
	<p class="alert">
		{m.user_hidden_note()} <a href={resolve('/settings')}>{m.user_hidden_settings()}</a>
	</p>
{/snippet}

<div class="grid">
	<section class="card" aria-labelledby="results-title">
		<h2 id="results-title">{m.user_results()}</h2>
		{#if data.isOwn && !data.visibility.results}{@render hiddenNote()}{/if}
		{#if !data.results}
			<p class="muted">{m.user_results_hidden()}</p>
		{:else if !data.results.length}
			<p class="muted">{m.user_results_empty()}</p>
		{:else}
			<div class="table">
				<table>
					<thead>
						<tr>
							<th scope="col">{m.user_history_tournament()}</th>
							<th scope="col">{m.user_history_organization()}</th>
							<th scope="col">{m.user_history_date()}</th>
							<th scope="col">{m.user_history_status()}</th>
							<th scope="col">{m.user_history_rank()}</th>
							<th scope="col">{m.standings_record()}</th>
							<th scope="col"><span class="visually-hidden">{m.t_matches()}</span></th>
						</tr>
					</thead>
					<tbody>
						{#each data.results as item (`${item.orgSlug}/${item.slug}`)}
							{@const params = { org: item.orgSlug, tournament: item.slug }}
							<tr>
								<td class="name">
									<a href={resolve('/t/[org]/[tournament]', params)}>{item.name}</a>
								</td>
								<td><a href={resolve('/o/[org]', { org: item.orgSlug })}>{item.orgName}</a></td>
								<td>{formatDate(item.date)}</td>
								<td><span class="badge">{statusLabel(item.status)}</span></td>
								<td>{item.finalRank ? m.participants_rank({ rank: item.finalRank }) : '–'}</td>
								<td>{formatRecord(item.record)}</td>
								<td>
									<a
										href={resolve('/t/[org]/[tournament]/matches', params)}
										aria-label={m.user_matches_of({ name: item.name })}
									>
										{m.t_matches()}
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	<div class="side">
		<section class="card" aria-labelledby="activity-title">
			<h2 id="activity-title">{m.user_activity()}</h2>
			{#if data.isOwn && !data.visibility.activity}{@render hiddenNote()}{/if}
			{#if !data.activity}
				<p class="muted">{m.user_activity_hidden()}</p>
			{:else}
				<h3>{m.user_registered()}</h3>
				<TournamentList items={data.activity.tournaments} empty={m.user_activity_empty()} />
				{#if data.activity.organizations.length}
					<h3>{m.user_organizations()}</h3>
					<ul>
						{#each data.activity.organizations as org (org.slug)}
							<li class="org">
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
			<section class="card" aria-labelledby="accounts-title">
				<h2 id="accounts-title">{m.user_accounts()}</h2>
				<ul>
					{#each data.accounts as account (account.module)}
						<li><span class="muted">{account.module}</span> {account.username}</li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
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
		align-items: start;

		@include up($bp-md) {
			grid-template-columns: 2fr 1fr;
		}
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}

	section {
		min-width: 0;
	}

	h2 {
		font-size: 1.15rem;
	}

	h3 {
		font-size: 0.95rem;
		color: var(--text-muted);
		margin: 1rem 0 0.25rem;
	}

	.table {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;

		th,
		td {
			padding: 0.4rem 0.6rem;
			text-align: left;
			white-space: nowrap;
			font-variant-numeric: tabular-nums;
		}

		th {
			font-size: 0.8rem;
			color: var(--text-muted);
			font-weight: 600;
		}

		tbody tr td {
			border-top: 1px solid var(--border);
		}

		.name a {
			font-weight: 600;
		}
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

	.org {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;

		span {
			min-width: 0;
		}
	}
</style>
