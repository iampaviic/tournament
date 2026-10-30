<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import MatchLines from '#lib/components/MatchLines.svelte';
	import {
		groupName,
		matchContext,
		matchStatusLabel,
		progressTone,
		stageLabel
	} from '#lib/labels.ts';
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
	const side = (match: Item, slot: 0 | 1) => {
		const entrant = match.entrants[slot];
		return {
			name: name(entrant),
			placeholder: !entrant,
			score: match.result?.scores?.[slot] ?? null
		};
	};
	const room = (id: string) =>
		resolve('/t/[org]/[tournament]/matches/[id]', {
			org: data.org.slug,
			tournament: data.tournament.slug,
			id
		});
</script>

{#snippet link(match: Item)}
	{@const winner = match.result?.winner ?? null}
	{@const mySide = data.me ? match.entrants.indexOf(data.me) : -1}
	<a href={room(match.id)}>
		<span class="number">#{match.number}</span>
		<MatchLines
			sides={[side(match, 0), side(match, 1)]}
			winner={match.status === 'completed' ? winner : null}
			me={mySide === 0 || mySide === 1 ? mySide : null}
		/>
		<span class="context muted">{matchContext(match)}</span>
		<span class="status">
			<span class="badge {progressTone(match.progress)}">{matchStatusLabel(match.progress)}</span>
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

	{#if mine.length && data.stageCount === 1}<h2>{m.t_all_matches()}</h2>{/if}
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
		margin-top: 2rem;
	}

	h3 {
		margin-top: 1.25rem;
	}

	.bar {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.5rem;
	}

	.live {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: var(--fs-small);
		color: var(--text-muted);

		&::before {
			content: '';
			width: 0.5rem;
			height: 0.5rem;
			border-radius: 50%;
			background: var(--control);
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
			border-top: 1px solid var(--rule);
		}

		a {
			display: grid;
			grid-template-columns: 2.5rem minmax(0, 24rem) minmax(0, 1fr) auto;
			align-items: center;
			gap: 1rem;
			padding: 0.5rem var(--pad) 0.75rem;
			color: var(--text);
			text-decoration: none;

			&:hover {
				background: var(--surface-2);
			}
		}
	}

	.number {
		color: var(--text-muted);
		font-size: var(--fs-small);
		font-variant-numeric: tabular-nums;
	}

	.context {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	// One fixed cell for the state, so it is in the same place on every row.
	.status {
		display: flex;
		justify-content: flex-end;
	}
</style>
