<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { formatLabel } from '#lib/labels.ts';
	import { STAGE_TYPES, type StageConfig } from '#lib/tournaments.ts';

	interface Props {
		title: string;
		/** Field name prefix, e.g. `s0.` */
		prefix: string;
		stage: StageConfig;
		/** The first of two stages: split into groups and choose how many advance. */
		groupStage?: boolean;
	}

	let { title, prefix, stage, groupStage = false }: Props = $props();

	let type = $derived(stage.type);
	const id = (key: string) => prefix + key;
	const settings = $derived(stage.settings);
</script>

<section class="card">
	<h2>{title}</h2>
	<div class="grid">
		<div class="field">
			<label for={id('type')}>{m.structure_format()}</label>
			<select id={id('type')} name={id('type')} bind:value={type}>
				{#each STAGE_TYPES as option (option)}
					<option value={option}>{formatLabel(option)}</option>
				{/each}
			</select>
		</div>
		{#if groupStage}
			<div class="field">
				<label for={id('groupCount')}>{m.structure_groups()}</label>
				<input
					id={id('groupCount')}
					name={id('groupCount')}
					type="number"
					min="1"
					max="32"
					value={settings.groupCount}
				/>
			</div>
			<div class="field">
				<label for={id('advancePerGroup')}>{m.structure_advance()}</label>
				<input
					id={id('advancePerGroup')}
					name={id('advancePerGroup')}
					type="number"
					min="1"
					max="64"
					value={settings.advancePerGroup}
				/>
			</div>
		{/if}
		{#if type === 'swiss'}
			<div class="field">
				<label for={id('swissRounds')}>{m.structure_swiss_rounds()}</label>
				<input
					id={id('swissRounds')}
					name={id('swissRounds')}
					type="number"
					min="1"
					max="30"
					value={settings.swissRounds ?? ''}
				/>
				<span class="hint">{m.structure_swiss_rounds_hint()}</span>
			</div>
		{/if}
	</div>

	{#if type === 'single_elimination'}
		<label class="checkbox">
			<input type="checkbox" name={id('thirdPlaceMatch')} checked={settings.thirdPlaceMatch} />
			{m.structure_third_place()}
		</label>
	{:else if type === 'double_elimination'}
		<label class="checkbox">
			<input
				type="checkbox"
				name={id('grandFinalReset')}
				checked={settings.grandFinal === 'reset'}
			/>
			{m.structure_grand_final_reset()}
		</label>
	{:else}
		{#if type === 'round_robin'}
			<label class="checkbox">
				<input type="checkbox" name={id('doubleRoundRobin')} checked={settings.doubleRoundRobin} />
				{m.structure_double_round_robin()}
			</label>
		{/if}
		<fieldset class="points">
			<legend>{m.structure_points()}</legend>
			{#each [['win', m.structure_points_win()], ['draw', m.structure_points_draw()], ['loss', m.structure_points_loss()]] as const as [key, label] (key)}
				<label>
					{label}
					<input
						name={id(key)}
						type="number"
						min="0"
						max="100"
						step="0.5"
						value={settings.scoring[key]}
					/>
				</label>
			{/each}
		</fieldset>
	{/if}
</section>

<style lang="scss">
	h2 {
		font-size: var(--fs-section);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0 1rem;
	}

	.points {
		border: 0;
		padding: 0;
		margin: 0.5rem 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;

		legend {
			font-weight: 500;
			margin-bottom: 0.35rem;
		}

		label {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
			font-size: var(--fs-body);
			width: 6rem;
		}
	}
</style>
