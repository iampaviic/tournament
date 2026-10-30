<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { formatScore } from '#lib/format.ts';
	import { groupName, matchStatusLabel, stageLabel } from '#lib/labels.ts';
	import { listen } from '#lib/live.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Item = PageProps['data']['matches'][number];

	let connected = $state(false);
	// A string, so reloading the page data doesn't reconnect.
	const events = $derived(`${page.url.pathname}/events`);
	$effect(() => listen(events, { update: () => invalidateAll() }, (on) => (connected = on)));

	const active = (match: Item) => ['ready', 'reported', 'disputed'].includes(match.progress);
	const isMine = (match: Item) => data.me !== null && match.entrants.includes(data.me);
	/** The viewer's matches, the ones to play first. */
	const mine = $derived(
		data.matches.filter(isMine).toSorted((a, b) => Number(active(b)) - Number(active(a)))
	);
	const stages = $derived(
		data.stages
			.map((stage) => ({
				index: stage.index,
				groups: Array.from({ length: stage.groupCount }, (_, groupIndex) =>
					data.matches.filter(
						(match) => match.stageIndex === stage.index && match.groupIndex === groupIndex
					)
				)
			}))
			.filter((stage) => stage.groups.some((group) => group.length))
	);

	const name = (entrant: string | null | undefined) =>
		entrant === undefined
			? m.match_tbd()
			: entrant === null
				? m.match_bye()
				: (data.names[entrant] ?? '?');
	const room = (id: string) =>
		resolve('/t/[org]/[tournament]/matches/[id]', {
			org: data.org.slug,
			tournament: data.tournament.slug,
			id
		});
</script>

{#snippet link(match: Item)}
	<a href={room(match.id)}>
		<span class="number">#{match.number}</span>
		<span class="pair">
			<span>{name(match.entrants[0])}</span>
			<strong>{match.result?.scores ? formatScore(match.result.scores) : '–'}</strong>
			<span>{name(match.entrants[1])}</span>
		</span>
		<span class="badge" class:danger={match.progress === 'disputed'}>
			{matchStatusLabel(match.progress)}
		</span>
	</a>
{/snippet}

<div class="bar">
	<span class="live" class:on={connected} data-testid="live"
		>{connected ? m.live_on() : m.live_off()}</span
	>
</div>

{#if !data.matches.length}
	<p class="muted">{m.matches_empty()}</p>
{:else}
	{#if mine.length}
		<section aria-labelledby="your-matches">
			<h2 id="your-matches">{m.t_your_matches()}</h2>
			<ol class="card list">
				{#each mine as match (match.id)}
					<li>{@render link(match)}</li>
				{/each}
			</ol>
		</section>
	{/if}

	{#each stages as stage (stage.index)}
		{#if data.stageCount > 1}<h2>{stageLabel(stage.index, data.stageCount)}</h2>{/if}
		{#each stage.groups as group, groupIndex (groupIndex)}
			{#if group.length}
				{#if stage.groups.length > 1}<h3>{groupName(groupIndex)}</h3>{/if}
				<ol class="card list">
					{#each group as match (match.id)}
						<li data-testid="match-{match.id}" class:mine={isMine(match)}>{@render link(match)}</li>
					{/each}
				</ol>
			{/if}
		{/each}
	{/each}
{/if}

<style lang="scss">
	h2 {
		font-size: 1.25rem;
		margin-top: 1.5rem;
	}

	h3 {
		font-size: 1.05rem;
		margin-top: 1rem;
	}

	.bar {
		display: flex;
		justify-content: flex-end;
	}

	.live {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: var(--text-muted);

		&::before {
			content: '';
			width: 0.5rem;
			height: 0.5rem;
			border-radius: 50%;
			background: var(--border);
		}

		&.on::before {
			background: var(--success);
		}
	}

	.list {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0.25rem 0;
		overflow: hidden;

		li + li {
			border-top: 1px solid var(--border);
		}

		.mine {
			box-shadow: inset 3px 0 0 var(--accent);
		}

		a {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 0.6rem 1.25rem;
			color: var(--text);
			text-decoration: none;

			&:hover {
				background: var(--surface-2);
			}
		}
	}

	.number {
		min-width: 2.5rem;
		color: var(--text-muted);
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
	}

	.pair {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;

		strong {
			font-variant-numeric: tabular-nums;
		}
	}

	.badge {
		min-width: 5rem;
		text-align: center;
	}
</style>
