<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { ParticipantLabelProps } from '../types';
	import { flag, rankColor } from './ranks';

	let { participant }: ParticipantLabelProps = $props();

	const { rank, tr, country } = $derived(participant.fields);
	const countryFlag = $derived(flag(country));
</script>

<span class="label">
	{#if countryFlag}<span class="flag" title={country}>{countryFlag}</span>{/if}
	<span class="name">{participant.name}</span>
	{#if tr}<span class="tr" title={m.tetrio_tr({ tr })}>{tr}</span>{/if}
	{#if rank}
		<span class="rank" style:--rank={rankColor(rank)} title={rank}>
			{rank === m.tetrio_unranked() ? '?' : rank}
		</span>
	{/if}
</span>

<style lang="scss">
	.label {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
		width: 100%;
	}

	.flag {
		font-size: 0.85rem;
	}

	.name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		font-weight: 700;
	}

	.tr {
		font-size: 0.7rem;
		color: var(--bracket-muted);
		font-variant-numeric: tabular-nums;
	}

	.rank {
		flex-shrink: 0;
		min-width: 1.6rem;
		padding: 0 0.25rem;
		border-radius: 4px;
		background: var(--rank);
		color: #fff;
		font-size: 0.7rem;
		font-weight: 800;
		line-height: 1.15rem;
		text-align: center;
	}
</style>
