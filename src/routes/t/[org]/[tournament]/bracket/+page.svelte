<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import BracketView from '#lib/components/bracket/BracketView.svelte';
	import { groupName, formatLabel, stageLabel } from '#lib/labels.ts';
	import { themeById } from '#lib/themes/index.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const started = $derived(data.stages.some((stage) => stage.status !== 'pending'));
	const theme = $derived(themeById(data.themeId));
	const name = (participantId: string) => data.participants[participantId]?.name ?? '?';
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
							<h4>
								{stage.status === 'completed' ? m.placements_title() : m.placements_current()}
							</h4>
							<ol>
								{#each group.standings.filter((s) => s.rank !== null) as standing (standing.participantId)}
									<li><span class="rank">{standing.rank}</span> {name(standing.participantId)}</li>
								{/each}
							</ol>
						</div>
					{/if}

					{#if group.matches.length}
						<BracketView
							matches={group.matches}
							participants={data.participants}
							{theme}
							type={stage.type}
							me={data.me}
							disputed={data.disputed}
							label={m.bracket_label({
								name:
									stage.groups.length > 1
										? `${stageLabel(stage.index, data.stages.length)}, ${groupName(groupIndex)}`
										: stageLabel(stage.index, data.stages.length)
							})}
						/>
					{/if}
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
			font-size: var(--fs-body);
			font-weight: 400;
			margin-left: 0.5rem;
		}
	}

	.group {
		margin-bottom: 1.5rem;

		h3 {
			font-size: var(--fs-section);
		}

		h4 {
			font-size: var(--fs-body);
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
			font-size: var(--fs-small);
			color: var(--text-muted);
			font-weight: 600;
		}

		.name {
			text-align: left;
			width: 100%;
		}

		tbody tr + tr td {
			border-top: 1px solid var(--rule);
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
</style>
