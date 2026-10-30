<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import BracketCanvas from '#lib/components/bracket/BracketCanvas.svelte';
	import Mark from '#lib/components/Mark.svelte';
	import { formats, players } from '#lib/home/demo.ts';
	import { themes, themeStyle } from '#lib/themes/index.ts';

	const draw = formats[1].layout;
</script>

<section class="close" aria-labelledby="close-title">
	<div class="tile side" data-reveal data-ui inert style={themeStyle(themes[0].style)}>
		<div class="crop">
			<div style:width="{draw.width}px" style:height="{draw.height}px">
				<BracketCanvas layout={draw} participants={players} theme={themes[0]} elimination />
			</div>
		</div>
	</div>
	<div class="tile main" data-reveal style:--d="70ms">
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

<div class="mark" aria-hidden="true">
	<!-- The joint, built large from flat blocks with 4px gaps. -->
	<svg viewBox="0 0 1000 220" preserveAspectRatio="none" aria-hidden="true">
		<rect class="ink arm" x="0" y="0" width="596" height="64" />
		<rect class="ink arm" x="0" y="156" width="596" height="64" />
		<rect class="ink bar" x="600" y="0" width="64" height="220" />
		<rect class="blue carry" x="668" y="78" width="332" height="64" />
	</svg>
</div>

<style lang="scss">
	@use 'tokens' as *;

	// One row of the board, cropped at both window edges.
	.close {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
		width: 100vw;
		margin-inline: calc(50% - 50vw);

		@include up($bp-md) {
			grid-template-columns: minmax(0, 2fr) minmax(0, 10fr);
			height: 22.5rem;
		}
	}

	.tile {
		border-radius: var(--radius);
		overflow: hidden;
	}

	.side {
		display: none;

		@include up($bp-md) {
			display: block;
			border-radius: 0 var(--radius) var(--radius) 0;
		}
	}

	.side {
		background: var(--surface);
	}

	// Only the lines: round names cut off at the tile's edge read as a mistake, not a crop.
	.crop {
		padding: 1.5rem 0 0;
		transform: translateX(-38%);

		:global(.header) {
			visibility: hidden;
		}
	}

	.main {
		@include up($bp-md) {
			border-radius: var(--radius) 0 0 var(--radius);
		}

		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1rem;
		padding: 2.5rem 1.5rem;
		background: var(--accent);
		color: var(--accent-text);

		@include up($bp-md) {
			padding: 2.5rem;
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

	.mark {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		padding-block: 5rem 1rem;

		svg {
			width: 100%;
			height: clamp(4.5rem, 14vw, 10rem);
		}

		.ink {
			fill: var(--text);
		}

		.blue {
			fill: var(--accent);
		}
	}

	// Scrolling the mark into view draws it: the two arms, the bar that joins them, then the line that
	// carries on. Without scroll timelines it is simply there.
	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: view()) {
			.mark rect {
				transform-box: fill-box;
				transform-origin: left center;
				animation: grow linear both;
				animation-timeline: view();
			}

			.mark .arm {
				animation-range: entry 0% entry 100%;
			}

			.mark .bar {
				transform-origin: center top;
				animation-name: drop;
				animation-range: entry 40% entry 100%;
			}

			.mark .carry {
				animation-range: entry 60% entry 100%;
			}
		}
	}

	@keyframes grow {
		from {
			transform: scaleX(0.04);
		}
	}

	@keyframes drop {
		from {
			transform: scaleY(0.04);
		}
	}
</style>
