<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let {
		names,
		placeholders = [false, false],
		scores = null,
		winner = null,
		me = null,
		size = 'lg',
		intro = false,
		pending = false
	}: {
		/** The two players' names, in slot order. */
		names: [string, string];
		/** A slot without a player yet ("Winner of #3", a bye) is drawn without a side colour. */
		placeholders?: [boolean, boolean];
		scores?: readonly [number | null, number | null] | null;
		winner?: 0 | 1 | null;
		/** The side the viewer plays on. */
		me?: 0 | 1 | null;
		size?: 'md' | 'lg';
		/** Plays the versus intro on load: the sides slide in from their edges and the VS lands. */
		intro?: boolean;
		/** The scores are reported but not decided: the pips show them, half lit, without the numbers. */
		pending?: boolean;
	} = $props();

	// Round pips, as under a fighting game's health bars: one per game the leader has won, lit for
	// the games each side won.
	const pips = $derived(scores ? Math.max(scores[0] ?? 0, scores[1] ?? 0, 0) : 0);

	// The winner takes the screen. When a result arrives while the page is open, the take is played
	// once; a page opened on a decided match shows it already taken.
	let slam = $state(false);
	let seen: 0 | 1 | null | undefined;
	$effect(() => {
		const now = winner;
		if (seen === null && now !== null) {
			slam = true;
			setTimeout(() => (slam = false), 1200);
		}
		seen = now;
	});
</script>

<div class="versus {size}" class:decided={winner !== null} class:slam class:intro>
	{#each [0, 1] as const as i (i)}
		<div
			class="side s{i}"
			class:won={winner === i}
			class:lost={winner !== null && winner !== i}
			class:open={placeholders[i]}
		>
			<div class="tags">
				<span class="tag" aria-hidden="true">{m.versus_side({ side: i + 1 })}</span>
				{#if me === i}<span class="you">{m.versus_you()}</span>{/if}
			</div>
			<span class="who">{names[i]}</span>
			<span class="score">{pending ? '' : (scores?.[i] ?? '')}</span>
			{#if pips}
				<span class="pips" class:pending aria-hidden="true">
					{#each Array.from({ length: pips }, (_, n) => n) as n (n)}
						<i class:won={n < (scores?.[i] ?? 0)}></i>
					{/each}
				</span>
			{/if}
		</div>
	{/each}
	<span class="vs" aria-hidden="true">{m.versus_vs()}</span>
	<!-- The knockout banner: across the whole plate, in gold, once the match is decided. -->
	{#if winner !== null}<span class="banner">{m.versus_wins({ name: names[winner] })}</span>{/if}
</div>

<style lang="scss">
	@use 'tokens' as *;

	// Two sides meeting at a slanted cut: player one's colour on the left, player two's on the right.
	.versus {
		--cut: 32px;
		position: relative;
		display: flex;
		min-height: 168px;
		overflow: hidden;
		border-radius: var(--radius);
		background: var(--surface);
		isolation: isolate;

		@include up($bp-md) {
			--cut: 48px;
			min-height: 210px;
		}

		&.md {
			min-height: 128px;

			@include up($bp-md) {
				--cut: 36px;
				min-height: 148px;
			}
		}

		// A decided plate makes room in its middle for the banner, between scores and names.
		&.decided {
			min-height: 200px;

			@include up($bp-md) {
				min-height: 256px;
			}
		}

		&.md.decided {
			min-height: 164px;

			@include up($bp-md) {
				min-height: 188px;
			}
		}
	}

	.side {
		--side: var(--p1);
		position: relative;
		flex: 1 1 0;
		display: grid;
		grid-template:
			'tags score' auto
			'. score' 1fr
			'who who' auto
			'pips pips' auto / 1fr auto;
		gap: 0.35rem 0.75rem;
		min-width: 0;
		padding: 1rem calc(var(--cut) / 2 + 1rem) 1.1rem 1.1rem;
		background: var(--side);
		color: var(--on-side);
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--cut)) 100%, 0 100%);
		margin-right: calc(var(--cut) / -2);
		transition:
			flex-grow 480ms var(--ease-expo),
			background-color 300ms ease;

		&.s1 {
			--side: var(--p2);
			grid-template:
				'score tags' auto
				'score .' 1fr
				'who who' auto
				'pips pips' auto / auto 1fr;
			padding: 1rem 1.1rem 1.1rem calc(var(--cut) / 2 + 1rem);
			clip-path: polygon(var(--cut) 0, 100% 0, 100% 100%, 0 100%);
			margin: 0 0 0 calc(var(--cut) / -2);
			text-align: right;

			.tags,
			.pips {
				justify-content: flex-end;
			}
		}

		// A slot no player has reached yet carries no side colour.
		&.open {
			background: var(--surface-2);
			color: var(--text-muted);

			.who {
				font-family: var(--font);
				font-size: 1rem;
				font-weight: 500;
			}
		}

		&.won {
			flex-grow: 1.5;
		}

		// The loser's side drains to a shadow of its colour.
		&.lost {
			background: color-mix(in srgb, var(--side) 22%, var(--surface));
			color: var(--text-muted);
		}
	}

	.tags {
		grid-area: tags;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.tag,
	.you {
		padding: 0.15rem 0.45rem;
		border-radius: var(--radius-tag);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		line-height: 1.2;
	}

	.tag {
		background: color-mix(in srgb, currentColor 16%, transparent);
	}

	.you {
		background: var(--accent);
		color: var(--accent-text);
		letter-spacing: 0.02em;
	}

	.who {
		grid-area: who;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-family: var(--font-display);
		font-size: clamp(1.5rem, 4.2vw, 2.75rem);
		line-height: 1.05;

		.md & {
			font-size: clamp(1.25rem, 3vw, 2rem);
		}
	}

	.score {
		grid-area: score;
		align-self: start;
		font-family: var(--font-display);
		font-size: clamp(2rem, 6vw, 3.75rem);
		line-height: 1;
		font-variant-numeric: tabular-nums;

		.md & {
			font-size: clamp(1.5rem, 4vw, 2.5rem);
		}
	}

	.pips {
		grid-area: pips;
		display: flex;
		gap: 0.5rem;
		min-height: 0.9rem;

		i {
			width: 0.75rem;
			height: 0.75rem;
			border: 2px solid currentColor;
			border-radius: 2px;
			transform: rotate(45deg);
			transition: background-color 200ms ease;

			&.won {
				background: currentColor;
			}
		}

		// Reported, not yet decided: the lit pips are half lit.
		&.pending i.won {
			background: color-mix(in srgb, currentColor 45%, transparent);
		}
	}

	// Gold, outlined in the stage's ink, sitting in the cut.
	.vs {
		position: absolute;
		left: 50%;
		top: 42%;
		z-index: 2;
		transform: translate(-50%, -50%);
		color: var(--accent);
		font-family: var(--font-display);
		font-size: clamp(2rem, 5vw, 3.5rem);
		line-height: 1;
		-webkit-text-stroke: 4px var(--accent-text);
		paint-order: stroke fill;
		pointer-events: none;
		transition: opacity 200ms ease;

		.md & {
			font-size: clamp(1.5rem, 3.6vw, 2.5rem);
		}

		.decided & {
			opacity: 0;
		}
	}

	// Gold edged in the stage's ink, straight across both sides and the cut.
	.banner {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		z-index: 3;
		padding: 0.45rem 1rem;
		overflow: hidden;
		border-block: 3px solid var(--accent-text);
		background: var(--accent);
		color: var(--accent-text);
		font-family: var(--font-display);
		font-size: clamp(1.25rem, 3vw, 2rem);
		line-height: 1.1;
		letter-spacing: 0.02em;
		text-align: center;
		text-overflow: ellipsis;
		text-transform: uppercase;
		white-space: nowrap;
		transform: translateY(-50%);

		.md & {
			font-size: clamp(1.05rem, 2.4vw, 1.5rem);
		}
	}

	// A result arriving live: the winner's side surges and the banner slams down.
	@media (prefers-reduced-motion: no-preference) {
		:global(.js) .intro {
			.s0 {
				animation: from-left 700ms var(--ease-expo) 120ms both;
			}

			.s1 {
				animation: from-right 700ms var(--ease-expo) 120ms both;
			}

			.vs {
				animation: land 480ms var(--ease-slam) 620ms both;
			}
		}

		.slam .won {
			animation: surge 700ms var(--ease-expo);
		}

		.slam .banner {
			animation: banner 520ms var(--ease-slam) 180ms both;
		}
	}

	@keyframes from-left {
		from {
			transform: translateX(-60%);
		}
	}

	@keyframes from-right {
		from {
			transform: translateX(60%);
		}
	}

	@keyframes land {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(2.6);
		}
	}

	@keyframes surge {
		0% {
			filter: brightness(1.6);
		}
		100% {
			filter: none;
		}
	}

	@keyframes banner {
		0% {
			opacity: 0;
			transform: translateY(-50%) scale(1.35, 0);
		}
		100% {
			opacity: 1;
			transform: translateY(-50%);
		}
	}
</style>
