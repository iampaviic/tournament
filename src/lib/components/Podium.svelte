<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import Avatar from './Avatar.svelte';

	interface Placed {
		id: string;
		username: string;
		displayName: string;
		avatarUrl: string | null;
		finalRank: number | null;
	}

	let { participants }: { participants: Placed[] } = $props();

	// Second, first and third, as they stand on a podium; a shared place shows every name on its step.
	const steps = $derived(
		[2, 1, 3]
			.map((rank) => ({ rank, players: participants.filter((p) => p.finalRank === rank) }))
			.filter((step) => step.players.length)
	);
</script>

<section class="podium" aria-labelledby="podium-title">
	<h2 id="podium-title">{m.placements_title()}</h2>
	<ol>
		{#each steps as step (step.rank)}
			<li class="step r{step.rank}">
				<div class="who">
					{#each step.players as player (player.id)}
						<a href={resolve('/u/[username]', { username: player.username })}>
							<Avatar
								src={player.avatarUrl}
								name={player.displayName}
								size={step.rank === 1 ? 64 : 48}
							/>
							<span class="name">{player.displayName}</span>
						</a>
					{/each}
				</div>
				<div class="block">
					<span class="rank">{step.rank}</span>
				</div>
			</li>
		{/each}
	</ol>
</section>

<style lang="scss">
	@use 'tokens' as *;

	.podium {
		margin-bottom: 2.5rem;

		h2 {
			margin: 0 0 1rem;
		}
	}

	ol {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		align-items: end;
		gap: 0.5rem;
		max-width: 40rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
	}

	.who {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;

		a {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.4rem;
			max-width: 100%;
			color: var(--text);
			text-decoration: none;

			&:hover .name {
				color: var(--accent-ink);
			}
		}
	}

	.name {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	// The step itself: gold for the winner, the two side colours for second and third.
	.block {
		display: grid;
		place-items: start center;
		padding-top: 0.6rem;
		border-radius: var(--radius-sm) var(--radius-sm) 0 0;
		background: var(--p2);
		color: var(--on-side);
		transform-origin: bottom;
	}

	.r1 .block {
		height: 7rem;
		background: var(--accent);
		color: var(--accent-text);
	}

	.r2 .block {
		height: 5rem;
	}

	.r3 .block {
		height: 3.75rem;
		background: var(--p1);
	}

	.rank {
		font-family: var(--font-display);
		font-size: 2rem;
		line-height: 1;
	}

	.r1 .rank {
		font-size: 2.75rem;
	}

	// The steps rise in order, third to first, once on load.
	@media (prefers-reduced-motion: no-preference) {
		:global(.js) .block {
			animation: rise 700ms var(--ease-expo) both;
		}

		:global(.js) .r3 .block {
			animation-delay: 100ms;
		}

		:global(.js) .r2 .block {
			animation-delay: 250ms;
		}

		:global(.js) .r1 .block {
			animation-delay: 400ms;
		}
	}

	@keyframes rise {
		from {
			transform: scaleY(0);
		}
	}
</style>
