<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import BracketCanvas from '#lib/components/bracket/BracketCanvas.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { miniDraw, NAMES, placings, players } from '#lib/home/demo.ts';
	import { themes, themeStyle } from '#lib/themes/index.ts';

	const clauses = [m.home_stage_1, m.home_stage_2, m.home_stage_3, m.home_stage_4];
	const names = [
		m.home_stage_name_1,
		m.home_stage_name_2,
		m.home_stage_name_3,
		m.home_stage_name_4
	];
	const checked = [true, true, false, true, true, false];
	let step = $state(0);
</script>

<section class="stages" aria-labelledby="stage-title">
	<!-- The clause and the slider that changes it share one blue band; the stage's sheet follows. -->
	<div class="band" data-reveal="open">
		<div class="band-inner">
			{#key step}<h2 id="stage-title">{clauses[step]()}</h2>{/key}
			<div class="slider">
				<div class="rail" style:--passed={step / 3}>
					<span class="passed" aria-hidden="true"></span>
					<input
						type="range"
						min="0"
						max="3"
						step="1"
						bind:value={step}
						aria-label={m.home_stage_slider()}
						aria-valuetext={names[step]()}
					/>
				</div>
				<!-- Each name sits under its stop and picks it, as the slider does. -->
				<ol class="steps">
					{#each names as name, i (i)}
						<li>
							<button
								type="button"
								tabindex="-1"
								aria-current={step === i ? 'step' : undefined}
								onclick={() => (step = i)}>{name()}</button
							>
						</li>
					{/each}
				</ol>
			</div>
		</div>
	</div>

	<div class="picture" data-reveal="settle" style:--d="200ms">
		<div class="fragment sheet" class:shown={step === 0} data-ui inert>
			<h3>{m.t_registration()}</h3>
			<div class="track"><span style:width="{(11 / 32) * 100}%"></span></div>
			<p class="muted">{m.t_capacity({ count: 11, limit: 32 })}</p>
			<span class="btn primary">{m.t_register()}</span>
		</div>
		<div class="fragment sheet" class:shown={step === 1} data-ui inert>
			<h3>{m.home_stage_name_2()}</h3>
			<ul class="names">
				{#each NAMES.slice(0, 6) as name, i (name)}
					<li>
						<span class="name">{name}</span>
						{#if checked[i]}<Icon name="check" />{/if}
					</li>
				{/each}
			</ul>
			<p class="muted">{m.home_checked_in({ count: 4, total: 6 })}</p>
		</div>
		<div
			class="fragment sheet draw"
			class:shown={step === 2}
			style={themeStyle(themes[0].style)}
			data-ui
			inert
		>
			<div style:width="{miniDraw.width}px" style:height="{miniDraw.height}px">
				<BracketCanvas layout={miniDraw} participants={players} theme={themes[0]} elimination />
			</div>
		</div>
		<div class="fragment sheet" class:shown={step === 3} data-ui inert>
			<h3>{m.placements_title()}</h3>
			<ol class="places">
				{#each placings as place (place.rank)}
					<li><span class="rank">{place.rank}</span><span class="name">{place.name}</span></li>
				{/each}
			</ol>
		</div>
	</div>
</section>

<style lang="scss">
	@use 'tokens' as *;

	.stages {
		width: 100vw;
		margin-inline: calc(50% - 50vw);
		padding-bottom: 5rem;

		@include up($bp-md) {
			padding-bottom: 6rem;
		}
	}

	// The pen's flat field, only as tall as the clause and its control.
	.band {
		background: var(--accent);
		color: var(--accent-text);

		// The site's focus ring is blue; on the blue band it is drawn in the band's text colour.
		:focus-visible {
			outline-color: var(--accent-text);
		}
	}

	.band-inner {
		display: grid;
		gap: 1.5rem;
		max-width: calc(72rem + 2rem);
		margin: 0 auto;
		padding: 2.5rem 1rem 1.75rem;

		@include up($bp-md) {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			align-items: end;
			gap: 4rem;
			padding-block: 3.5rem 2.5rem;
		}
	}

	// A statement, as the other sections have; the display size belongs to the hero alone.
	h2 {
		margin: 0;
		max-width: 14ch;
		font-size: var(--fs-statement);
		line-height: 1.1;
		animation: swap 200ms ease-out;
	}

	@keyframes swap {
		from {
			opacity: 0;
		}
	}

	// The track is drawn under a transparent native one, in the band's own colours: the passed part
	// in full, the rest faint. The rail is inset by the knob's radius, so each stop sits exactly over
	// its name.
	.rail {
		position: relative;
		height: 2.75rem;
		margin-inline: -0.75rem;

		&::before,
		.passed {
			content: '';
			position: absolute;
			left: 0.75rem;
			top: calc(50% - 3px);
			height: 6px;
			border-radius: 999px;
		}

		&::before {
			right: 0.75rem;
			background: color-mix(in srgb, var(--accent-text) 35%, transparent);
		}

		.passed {
			width: calc((100% - 1.5rem) * var(--passed));
			background: var(--accent-text);
		}
	}

	input[type='range'] {
		position: relative;
		width: 100%;
		height: 100%;
		margin: 0;
		background: none;
		appearance: none;
		cursor: pointer;

		&::-webkit-slider-runnable-track {
			height: 8px;
			background: transparent;
		}

		&::-moz-range-track {
			height: 8px;
			background: transparent;
		}

		// A round knob, as on a switch, ringed in the band's blue so it sits on the track.
		&::-webkit-slider-thumb {
			width: 1.5rem;
			height: 1.5rem;
			margin-top: calc(4px - 0.75rem);
			border: 3px solid var(--accent);
			border-radius: 50%;
			background: var(--accent-text);
			appearance: none;
			transition: transform var(--t-press) var(--ease-out);
		}

		&::-moz-range-thumb {
			width: 1.5rem;
			height: 1.5rem;
			box-sizing: border-box;
			border: 3px solid var(--accent);
			border-radius: 50%;
			background: var(--accent-text);
		}

		&:active::-webkit-slider-thumb {
			transform: scale(1.1);
		}
	}

	// Stops at 0, ⅓, ⅔ and 1: the outer names hang from the ends, the inner ones centre on theirs.
	// A phone has no room for that, so there the four names share the width evenly.
	.steps {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		margin: 0;
		padding: 0;
		list-style: none;

		@include up($bp-sm) {
			grid-template-columns: 1fr 2fr 2fr 1fr;
		}

		li:nth-child(2),
		li:nth-child(3) {
			text-align: center;
		}

		li:last-child {
			text-align: right;
		}

		button {
			min-height: 44px;
			padding: 0;
			border: 0;
			background: none;
			color: color-mix(in srgb, var(--accent-text) 82%, transparent);
			font: inherit;
			font-size: 0.875rem;
			white-space: nowrap;
			cursor: pointer;
			transition: color var(--t-hover) ease;

			@include up($bp-sm) {
				font-size: 1rem;
			}

			&:hover,
			&[aria-current] {
				color: var(--accent-text);
			}

			&[aria-current] {
				font-weight: 650;
			}
		}
	}

	// The stage itself, on a sheet in the field under the band.
	.picture {
		display: grid;
		grid-template-columns: minmax(0, 34rem);
		place-content: center;
		min-width: 0;
		overflow: hidden;
		padding: 1.5rem 1rem 0;

		// On a wide screen the sheet sits in the slider's column, under the control that changes it.
		@include up($bp-md) {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			place-content: normal;
			column-gap: 4rem;
			padding: 2.5rem max(1rem, calc(50vw - 36rem));
			background: var(--surface-2);
		}
	}

	// Only the current step's sheet takes room, so the field is as tall as what it shows; stacked,
	// the tallest step left the others floating in space. Each fades in as it is picked.
	.fragment {
		width: min(100%, 34rem);

		@include up($bp-md) {
			grid-column: 2;
		}

		&:not(.shown) {
			display: none;
		}

		&.shown {
			animation: swap 200ms ease-out;
		}
	}

	.sheet {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 1.5rem;
		border: 1px solid var(--border); /* taste-skill-ignore: a product fragment (data-ui) */
		border-radius: var(--radius);
		background: var(--surface);
		font-size: 1rem;

		h3,
		p {
			margin: 0;
		}
	}

	// The draw is wider than a phone; there it is cropped like a sheet folded under.
	.draw {
		width: max-content;
		max-width: 100%;
		overflow: hidden;
		padding: 1rem 1.25rem;
	}

	.track {
		align-self: stretch;
		height: 8px;
		border-radius: 999px;
		background: var(--accent-track);

		span {
			display: block;
			height: 100%;
			border-radius: inherit;
			background: var(--accent);
		}
	}

	.names,
	.places {
		align-self: stretch;
		margin: 0;
		padding: 0;
		list-style: none;

		li {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 0.75rem;
			min-height: 40px;
			border-bottom: 1px solid var(--rule); /* taste-skill-ignore: list rows in a product fragment (data-ui) */
			color: var(--success);
		}

		.name {
			color: var(--text);
		}
	}

	.places li {
		justify-content: flex-start;

		.rank {
			width: 1.5rem;
			color: var(--text-muted);
			font-variant-numeric: tabular-nums;
		}
	}
</style>
