<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import ScoreForm from '#lib/components/ScoreForm.svelte';
	import { matchNumbers } from '#lib/bracketLayout.ts';
	import { sections } from '#lib/bracketView.ts';
	import { formatScore } from '#lib/format.ts';
	import {
		groupName,
		matchContext,
		matchStatusLabel,
		progressTone,
		sideLabel,
		stageLabel
	} from '#lib/labels.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

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

{#if form?.error}
	<p class="alert error" role="alert">{form.error}</p>
{:else if form?.message}
	<p class="alert success" role="status">{form.message}</p>
{/if}

{#if data.stages.length}
	<section class="queue">
		<h2>{m.queue_title()}</h2>
		<p class="muted">{m.queue_lead()}</p>
		{#if data.queue.length}
			<ol class="card">
				{#each data.queue as item (item.id)}
					{@const context = matchContext(item)}
					{@const names = [name(item.entrants[0]), name(item.entrants[1])] as [string, string]}
					<li data-testid="queue-{item.id}">
						<div class="summary">
							<p class="title">
								<a href={room(item.id)}>{m.match_number({ number: item.number })}</a>
								{#if context}<span class="muted">{context}</span>{/if}
							</p>
							<p class="tags">
								<span class="badge {progressTone(item.progress)}">
									{matchStatusLabel(item.progress)}
								</span>
								{#if item.helpRequested}<span class="badge danger">{m.match_help()}</span>{/if}
							</p>
							{#each item.reports as report (report.side)}
								<p class="report">
									{m.room_reported({ name: names[report.side], score: formatScore(report.scores) })}
								</p>
							{/each}
						</div>
						<ScoreForm action="?/result" {names} submit={m.matches_save()}>
							<input type="hidden" name="matchId" value={item.id} />
						</ScoreForm>
						<div class="actions">
							{#if item.helpRequested}
								<form method="POST" action="?/clearHelp" use:enhance>
									<input type="hidden" name="matchId" value={item.id} />
									<button class="btn small" type="submit">{m.room_help_clear()}</button>
								</form>
							{/if}
							<a href={room(item.id)}>{m.queue_open()}</a>
						</div>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="muted">{m.queue_empty()}</p>
		{/if}
	</section>
{/if}

{#each data.stages as stage (stage.id)}
	<h2>{stageLabel(stage.index, data.stageCount)}</h2>
	{#each stage.groups as group, groupIndex (groupIndex)}
		{@const numbers = matchNumbers(group.matches.map((match) => match.template))}
		{#if stage.groups.length > 1}<h3>{groupName(groupIndex)}</h3>{/if}
		{#each sections(group.matches) as section (section.side)}
			{#if sideLabel(section.side)}<h4>{sideLabel(section.side)}</h4>{/if}
			{#each section.rounds as round (round.round)}
				<div class="card round">
					<h5>{m.round_name({ round: round.round })}</h5>
					<ul>
						{#each round.matches as match (match.id)}
							{@const editable =
								stage.status === 'running' &&
								(match.status === 'ready' || match.status === 'completed')}
							<li data-testid="match-{match.id}">
								<span class="number"
									>{numbers.has(match.template.id)
										? `#${numbers.get(match.template.id)}`
										: ''}</span
								>
								<span class="badge {progressTone(match.status)}"
									>{matchStatusLabel(match.status)}</span
								>
								{#if editable}
									<ScoreForm
										action="?/result"
										names={[name(match.entrants[0]), name(match.entrants[1])]}
										scores={match.result?.scores}
										submit={m.matches_save()}
									>
										<input type="hidden" name="matchId" value={match.id} />
									</ScoreForm>
									{#if match.result}
										<form method="POST" action="?/clear" use:enhance>
											<input type="hidden" name="matchId" value={match.id} />
											<button class="btn small" type="submit">{m.matches_clear()}</button>
										</form>
									{/if}
								{:else}
									<span class="pair">
										{name(match.entrants[0])}
										{#if match.result?.scores}<strong
												>{match.result.scores[0]} – {match.result.scores[1]}</strong
											>{:else}–{/if}
										{name(match.entrants[1])}
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		{/each}
	{/each}
{:else}
	<p class="muted">{m.matches_empty()}</p>
{/each}

<style lang="scss">
	@use 'tokens' as *;

	h2 {
		font-size: var(--fs-section);
		margin-top: 1.5rem;
	}

	h3 {
		font-size: 1rem;
		margin-top: 1rem;
	}

	h4 {
		font-size: var(--fs-body);
		color: var(--text-muted);
		margin: 1rem 0 0.5rem;
	}

	.queue {
		margin-bottom: 2rem;

		// One sheet; each match on it is a ruled row: what it is, the score lines, what else to do.
		ol {
			list-style: none;
			margin: 0;
			padding-block: 0;
		}

		li {
			display: grid;
			gap: 0.75rem 2rem;
			padding-block: 1rem;

			& + li {
				border-top: 1px solid var(--rule);
			}

			@include up($bp-md) {
				grid-template-columns: minmax(0, 16rem) minmax(0, 1fr) auto;
				align-items: center;
			}
		}

		.summary {
			display: flex;
			flex-direction: column;
			gap: 0.35rem;
		}

		.title,
		.tags {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.25rem 0.5rem;
			margin: 0;
		}

		.title a {
			font-weight: 600;
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem 1rem;
		}

		.report {
			margin: 0;
			color: var(--text-muted);
		}
	}

	.round {
		margin-bottom: 0.75rem;
		padding: 0.75rem 1.25rem;

		h5 {
			font-size: var(--fs-small);
			color: var(--text-muted);
			margin: 0 0 0.5rem;
		}

		ul {
			list-style: none;
			margin: 0;
			padding: 0;
		}

		li {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem;
			padding: 0.4rem 0;

			& + li {
				border-top: 1px solid var(--rule);
			}
		}

		.number {
			min-width: 2rem;
			color: var(--text-muted);
			font-size: var(--fs-small);
			font-variant-numeric: tabular-nums;
		}

		.badge {
			min-width: 5rem;
			justify-content: center;
		}
	}

	.pair strong {
		margin: 0 0.5rem;
	}
</style>
