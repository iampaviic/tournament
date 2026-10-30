<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import BracketCanvas from '#lib/components/bracket/BracketCanvas.svelte';
	import { formats, players } from '#lib/home/demo.ts';
	import { formatLabel } from '#lib/labels.ts';
	import { themes, themeStyle } from '#lib/themes/index.ts';

	const theme = themes[0];
	const facts = {
		single_elimination: m.home_format_single_elimination,
		double_elimination: m.home_format_double_elimination,
		round_robin: m.home_format_round_robin,
		swiss: m.home_format_swiss
	};
	// One hue at four strengths, one per format.
	const tints = [12, 20, 28, 36].map(
		(share) => `color-mix(in srgb, var(--accent) ${share}%, var(--bg))`
	);
	/** The sheet fits the stage; larger brackets are shown smaller. */
	let stageWidth = $state(560);
	const scale = (width: number) => Math.min(1, Math.min(stageWidth - 48, 560) / (width + 16));

	let selected = $state(0);
</script>

<section class="formats" aria-labelledby="formats-title">
	<div class="index">
		<h2 id="formats-title" data-reveal>{m.home_formats()}</h2>
		<ul>
			{#each formats as format, i (format.type)}
				<li data-reveal style:--d="{90 + i * 70}ms">
					<button
						type="button"
						aria-pressed={selected === i}
						onpointerenter={() => (selected = i)}
						onfocus={() => (selected = i)}
						onclick={() => (selected = i)}
					>
						{formatLabel(format.type)}
					</button>
				</li>
			{/each}
		</ul>
		<p class="fact" data-reveal style:--d="380ms">{facts[formats[selected].type]()}</p>
		<p class="stages muted" data-reveal style:--d="380ms">{m.home_formats_stages()}</p>
	</div>

	<div
		class="stage"
		data-reveal="settle"
		style:--d="150ms"
		style:--tint={tints[selected]}
		aria-live="polite"
		bind:clientWidth={stageWidth}
	>
		<svg class="shape" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
			<path d="M0 14H78V86H0M78 50H100" />
		</svg>
		{#each formats as format, i (format.type)}
			<figure class="sheet" class:shown={selected === i} style={themeStyle(theme.style)} data-ui>
				<div
					class="scaled"
					style:width="{format.layout.width * scale(format.layout.width)}px"
					style:height="{format.layout.height * scale(format.layout.width)}px"
				>
					<div style:transform="scale({scale(format.layout.width)})" class="inner">
						<BracketCanvas
							layout={format.layout}
							participants={players}
							{theme}
							elimination={format.type.endsWith('elimination')}
						/>
					</div>
				</div>
				<figcaption class="muted">{m.home_example()} · {formatLabel(format.type)}</figcaption>
			</figure>
		{/each}
	</div>
</section>

<style lang="scss">
	@use 'tokens' as *;

	.formats {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 2.5rem;
		padding-block: 4rem;

		@include up($bp-md) {
			padding-block: 5rem;
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			align-items: center;
		}
	}

	.index {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;

		@include up($bp-md) {
			order: -1;
		}
	}

	h2,
	button {
		font-size: var(--fs-statement);
		font-stretch: 80%;
		font-weight: 750;
		line-height: 1.15;
		letter-spacing: -0.01em;
	}

	h2 {
		margin: 0;
		color: var(--text-muted);
	}

	ul {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;

		@media (max-width: $bp-md) {
			flex-direction: row;
			gap: 1.5rem;
			overflow-x: auto;
			scrollbar-width: none;
		}
	}

	button {
		padding: 0;
		border: 0;
		background: none;
		color: var(--text-muted);
		text-align: left;
		white-space: nowrap;
		cursor: pointer;
		transition: color 240ms ease-out;

		&[aria-pressed='true'],
		&:hover {
			color: var(--text);
		}
	}

	.fact {
		max-width: 26rem;
		margin: 1.25rem 0 0;
		font-size: var(--fs-lead);
	}

	.stages {
		margin: 0.25rem 0 0;
		font-size: 1rem;
	}

	// The joint, drawn large behind the bracket; its colour follows the chosen format.
	.stage {
		position: relative;
		display: grid;
		place-items: center;
		min-width: 0;
		min-height: 18rem;
		overflow: hidden;

		@include up($bp-md) {
			min-height: 26rem;
		}
	}

	.shape {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;

		path {
			fill: none;
			stroke: var(--tint);
			stroke-width: 14;
			transition: stroke 300ms ease-out;
		}
	}

	.sheet {
		grid-area: 1 / 1;
		position: relative;
		margin: 0;
		padding: 1rem 1rem 0.75rem;
		border-radius: var(--radius);
		background: var(--surface);
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 240ms ease-out,
			visibility 0s 240ms;

		&.shown {
			opacity: 1;
			visibility: visible;
			transition: opacity 240ms ease-out;
		}
	}

	.scaled {
		position: relative;
		overflow: hidden;
	}

	.inner {
		transform-origin: 0 0;
		padding-left: 0.5rem;
	}

	figcaption {
		margin-top: 0.5rem;
		font-size: 0.875rem;
	}
</style>
