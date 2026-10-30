<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import { matchNumbers } from '#lib/bracketLayout.ts';
	import { sections } from '#lib/bracketView.ts';
	import { groupName, matchStatusLabel, sideLabel, stageLabel } from '#lib/labels.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const name = (entrant: string | null | undefined) =>
		entrant === undefined
			? m.match_tbd()
			: entrant === null
				? m.match_bye()
				: (data.names[entrant] ?? '?');
</script>

{#if form?.error}
	<p class="alert error" role="alert">{form.error}</p>
{:else if form?.message}
	<p class="alert success" role="status">{form.message}</p>
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
								<span class="badge">{matchStatusLabel(match.status)}</span>
								{#if editable}
									<form method="POST" action="?/result" class="result" use:enhance>
										<input type="hidden" name="matchId" value={match.id} />
										<label>
											<span>{name(match.entrants[0])}</span>
											<input
												name="score1"
												type="number"
												min="0"
												required
												value={match.result?.scores?.[0] ?? ''}
												aria-label={m.matches_score({ name: name(match.entrants[0]) })}
											/>
										</label>
										<label>
											<input
												name="score2"
												type="number"
												min="0"
												required
												value={match.result?.scores?.[1] ?? ''}
												aria-label={m.matches_score({ name: name(match.entrants[1]) })}
											/>
											<span>{name(match.entrants[1])}</span>
										</label>
										<button class="btn small primary" type="submit">{m.matches_save()}</button>
									</form>
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
	h2 {
		font-size: 1.25rem;
		margin-top: 1.5rem;
	}

	h3 {
		font-size: 1.05rem;
		margin-top: 1rem;
	}

	h4 {
		font-size: 0.95rem;
		color: var(--text-muted);
		margin: 1rem 0 0.5rem;
	}

	.round {
		margin-bottom: 0.75rem;
		padding: 0.75rem 1.25rem;

		h5 {
			font-size: 0.85rem;
			color: var(--text-muted);
			margin: 0 0 0.5rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
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
				border-top: 1px solid var(--border);
			}
		}

		.number {
			min-width: 2rem;
			color: var(--text-muted);
			font-size: 0.85rem;
			font-variant-numeric: tabular-nums;
		}

		.badge {
			min-width: 5rem;
			text-align: center;
		}
	}

	.result {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;

		label {
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}

		input {
			width: 4rem;
		}
	}

	.pair strong {
		margin: 0 0.5rem;
	}
</style>
