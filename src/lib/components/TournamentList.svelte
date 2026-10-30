<script lang="ts">
	import { resolve } from '$app/paths';
	import type { TournamentStatus } from '#lib/server/db/schema.ts';
	import type { Game } from '#lib/tournaments.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import { statusLabel } from '#lib/labels.ts';
	import SteamGame from './SteamGame.svelte';

	interface Item {
		orgSlug: string;
		slug: string;
		name: string;
		status: TournamentStatus;
		startsAt: Date | null;
		/** Shown under the name, e.g. the organization. */
		detail?: string;
		finalRank?: number | null;
		game?: Game | null;
	}

	let { items, empty }: { items: Item[]; empty: string } = $props();
</script>

{#if items.length}
	<ul>
		{#each items as item (`${item.orgSlug}/${item.slug}`)}
			<li>
				<div class="title">
					{#if item.game}<SteamGame game={item.game} named={false} />{/if}
					<div>
						<a
							href={resolve('/t/[org]/[tournament]', { org: item.orgSlug, tournament: item.slug })}
						>
							{item.name}
						</a>
						<div class="muted small">
							{[item.detail, item.game?.name, item.startsAt && formatDate(item.startsAt)]
								.filter(Boolean)
								.join(' · ')}
						</div>
					</div>
				</div>
				{#if item.finalRank}
					<span class="badge">{m.participants_rank({ rank: item.finalRank })}</span>
				{:else}
					<span class="badge">{statusLabel(item.status)}</span>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<p class="muted">{empty}</p>
{/if}

<style lang="scss">
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0;

		& + li {
			border-top: 1px solid var(--border);
		}
	}

	.title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	a {
		font-weight: 600;
		text-decoration: none;
	}

	.small {
		font-size: 0.85rem;
	}

	p {
		margin: 0;
	}
</style>
