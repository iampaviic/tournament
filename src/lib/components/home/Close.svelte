<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import Mark from '#lib/components/Mark.svelte';
</script>

<section class="close" aria-labelledby="close-title">
	<div class="tile" data-reveal>
		<h2 id="close-title">{m.home_close_title()}</h2>
		<p>{m.home_close_lead()}</p>
		<form method="GET" action={resolve('/organizations/new')}>
			<label class="visually-hidden" for="close-org">{m.home_org_label()}</label>
			<input
				id="close-org"
				name="name"
				type="text"
				maxlength="80"
				autocomplete="organization"
				placeholder={m.home_org_label()}
			/>
			<button class="btn" type="submit"><Mark size={16} />{m.home_start()}</button>
		</form>
	</div>
</section>

<!-- The brand mark at the scale of the page: one bracket stroke, open on the left, and the
	 blue line that leaves its bar. -->
<div class="mark" aria-hidden="true">
	<span class="bracket"></span>
	<span class="carry"></span>
</div>

<style lang="scss">
	@use 'tokens' as *;

	// The closing row starts at the column and runs off the window's right edge, as the hero's joint.
	.close {
		display: grid;
		grid-template-columns:
			[full-start] minmax(1rem, 1fr)
			[content-start] minmax(0, 72rem)
			minmax(1rem, 1fr) [full-end];
		width: 100vw;
		margin-inline: calc(50% - 50vw);
	}

	.tile {
		grid-column: content-start / full-end;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1rem;
		padding: 2.5rem 1.5rem;
		border-radius: var(--radius) 0 0 var(--radius);
		background: var(--accent);
		color: var(--accent-text);

		@include up($bp-md) {
			min-height: 20rem;
			padding: 3rem;
		}

		h2 {
			margin: 0;
			font-size: var(--fs-statement);
			font-stretch: 80%;
			font-weight: 750;
			line-height: 1.05;
		}

		p {
			margin: 0;
			max-width: 34rem;
			font-size: var(--fs-lead);
		}
	}

	form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		max-width: 30rem;

		input {
			flex: 1 1 14rem;
			min-height: 44px;
			border-color: transparent;
			font-size: 1rem;
		}

		.btn {
			min-height: 44px;
			border-color: var(--surface);
			background: var(--surface);
			color: var(--text);
			font-size: 1rem;
		}
	}

	// Every stroke the same weight at any width, as in the 20px mark in the header.
	.mark {
		--stroke: clamp(0.875rem, 2.2vw, 1.75rem);
		display: flex;
		align-items: center;
		height: clamp(4.5rem, 14vw, 10rem);
		margin-block: 5rem 1rem;
	}

	.bracket {
		flex: 0 0 58%;
		align-self: stretch;
		border: var(--stroke) solid var(--text);
		border-left: 0;
	}

	.carry {
		flex: 1;
		height: var(--stroke);
		background: var(--accent);
	}

	// Scrolling the mark into view draws it the way the line runs: the bracket from its open end to
	// the bar, then the line that carries on. Without scroll timelines it is simply there.
	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: view()) {
			.bracket,
			.carry {
				animation: linear both;
				animation-timeline: view();
			}

			.bracket {
				animation-name: draw;
				animation-range: entry 0% entry 80%;
			}

			.carry {
				transform-origin: left center;
				animation-name: carry;
				animation-range: entry 60% entry 100%;
			}
		}
	}

	@keyframes draw {
		from {
			clip-path: inset(0 100% 0 0);
		}

		to {
			clip-path: inset(0);
		}
	}

	@keyframes carry {
		from {
			transform: scaleX(0);
		}
	}
</style>
