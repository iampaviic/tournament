<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Icon from '#lib/components/Icon.svelte';
	import type { Tour } from '#lib/home/tour.svelte.ts';

	let { tour }: { tour: Tour } = $props();
</script>

<!-- Pause and play for a section that steps on its own, and how long until the next step. -->
{#if tour.available}
	<div class="tour" style:--interval="{tour.interval}ms">
		<button
			class="toggle"
			type="button"
			aria-pressed={tour.paused}
			onclick={() => (tour.paused = !tour.paused)}
		>
			<Icon name={tour.paused ? 'play' : 'pause'} />
			{tour.paused ? m.home_tour_play() : m.home_tour_pause()}
		</button>
		<span class="time" aria-hidden="true">
			{#key tour.step}<span class:run={tour.running} class:stopped={tour.paused}></span>{/key}
		</span>
	</div>
{/if}

<style lang="scss">
	.tour {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 32px;
		padding: 0 0.6rem;
		border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
		border-radius: var(--radius-sm);
		background: none;
		color: inherit;
		font-size: var(--fs-small);
		font-weight: 650;
		cursor: pointer;

		&:hover {
			border-color: currentColor;
		}

		@media (pointer: coarse) {
			min-height: 44px;
		}
	}

	// The time left on this step, filling once per step; it freezes while the tour holds.
	.time {
		flex: 1;
		max-width: 10rem;
		height: 3px;
		overflow: hidden;
		border-radius: 999px;
		background: color-mix(in srgb, currentColor 22%, transparent);

		span {
			display: block;
			height: 100%;
			border-radius: inherit;
			background: currentColor;
			transform: scaleX(0);
			transform-origin: left;
			animation: fill var(--interval) linear forwards paused;

			&.run {
				animation-play-state: running;
			}

			&.stopped {
				visibility: hidden;
			}
		}
	}

	@keyframes fill {
		to {
			transform: scaleX(1);
		}
	}
</style>
