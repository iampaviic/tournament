<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { sections } from '#lib/bracketView.ts';
	import { groupName, formatLabel, sideLabel, stageLabel } from '#lib/labels.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const started = $derived(data.stages.some((stage) => stage.status !== 'pending'));
	const name = (entrant: string | null | undefined) =>
		entrant === undefined
			? m.match_tbd()
			: entrant === null
				? m.match_bye()
				: (data.names[entrant] ?? '?');
</script>

{#if !started}
	<p class="muted">{m.t_bracket_empty()}</p>
{:else}
	{#each data.stages as stage (stage.id)}
		<section class="stage">
			<h2>
				{stageLabel(stage.index, data.stages.length)}
				<span class="muted format">{formatLabel(stage.type)}</span>
			</h2>
			{#if stage.status === 'pending'}
				<p class="muted">{m.t_stage_pending()}</p>
			{/if}

			{#each stage.groups as group, groupIndex (groupIndex)}
				<div class="group">
					{#if stage.groups.length > 1}<h3>{groupName(groupIndex)}</h3>{/if}

					{#if group.table}
						<table class="card standings">
							<thead>
								<tr>
									<th>{m.standings_rank()}</th>
									<th class="name">{m.standings_name()}</th>
									<th>{m.standings_played()}</th>
									<th>{m.standings_record()}</th>
									<th>{m.standings_games()}</th>
									<th>{m.standings_points()}</th>
								</tr>
							</thead>
							<tbody>
								{#each group.table as row (row.entrant)}
									<tr>
										<td>{row.rank}</td>
										<td class="name">{name(row.entrant)}</td>
										<td>{row.played}</td>
										<td>{row.wins}–{row.draws}–{row.losses}</td>
										<td>{row.gamesWon}:{row.gamesLost}</td>
										<td><strong>{row.points}</strong></td>
									</tr>
								{/each}
							</tbody>
						</table>
					{:else if group.standings.some((s) => s.rank !== null)}
						<div class="card placements">
							<h4>{m.placements_title()}</h4>
							<ol>
								{#each group.standings.filter((s) => s.rank !== null) as standing (standing.participantId)}
									<li><span class="rank">{standing.rank}</span> {name(standing.participantId)}</li>
								{/each}
							</ol>
						</div>
					{/if}

					{#each sections(group.matches) as section (section.side)}
						{#if sideLabel(section.side)}<h4>{sideLabel(section.side)}</h4>{/if}
						<div class="rounds">
							{#each section.rounds as round (round.round)}
								<div class="round">
									<h5>{m.round_name({ round: round.round })}</h5>
									{#each round.matches.filter((match) => match.status !== 'skipped') as match (match.id)}
										{@const winner = match.result?.winner}
										<div class="card match" class:done={match.status === 'completed'}>
											{#each [0, 1] as const as slot (slot)}
												<div class="slot" class:winner={winner === slot}>
													<span>{name(match.entrants[slot])}</span>
													<span class="score">{match.result?.scores?.[slot] ?? ''}</span>
												</div>
											{/each}
										</div>
									{/each}
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{/each}
		</section>
	{/each}
{/if}

<style lang="scss">
	.stage {
		margin-bottom: 2.5rem;

		h2 {
			font-size: 1.3rem;
		}

		.format {
			font-size: 0.9rem;
			font-weight: 400;
			margin-left: 0.5rem;
		}
	}

	.group {
		margin-bottom: 1.5rem;

		h3 {
			font-size: 1.1rem;
		}

		h4 {
			font-size: 0.95rem;
			color: var(--text-muted);
			margin: 1rem 0 0.5rem;
		}
	}

	.standings {
		width: 100%;
		max-width: 40rem;
		border-collapse: separate;
		border-spacing: 0;
		padding: 0.5rem;
		margin-bottom: 1rem;

		th,
		td {
			padding: 0.4rem 0.6rem;
			text-align: center;
			font-variant-numeric: tabular-nums;
			white-space: nowrap;
		}

		th {
			font-size: 0.8rem;
			color: var(--text-muted);
			font-weight: 600;
		}

		.name {
			text-align: left;
			width: 100%;
		}

		tbody tr + tr td {
			border-top: 1px solid var(--border);
		}
	}

	.placements {
		max-width: 24rem;
		margin-bottom: 1rem;

		h4 {
			margin-top: 0;
		}

		ol {
			list-style: none;
			margin: 0;
			padding: 0;
		}

		.rank {
			display: inline-block;
			width: 2rem;
			color: var(--text-muted);
		}
	}

	.rounds {
		display: flex;
		gap: 1rem;
		overflow-x: auto;
		padding-bottom: 0.5rem;
	}

	.round {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 12rem;

		h5 {
			margin: 0;
			font-size: 0.8rem;
			text-transform: uppercase;
			letter-spacing: 0.04em;
			color: var(--text-muted);
		}
	}

	.match {
		padding: 0;
		overflow: hidden;

		.slot {
			display: flex;
			justify-content: space-between;
			gap: 0.5rem;
			padding: 0.35rem 0.6rem;
			font-size: 0.9rem;

			& + .slot {
				border-top: 1px solid var(--border);
			}

			&.winner {
				font-weight: 600;
			}
		}

		.score {
			font-variant-numeric: tabular-nums;
			color: var(--text-muted);
		}
	}
</style>
