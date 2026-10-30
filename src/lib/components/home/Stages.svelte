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
	<div class="fields">
		<div class="clause" data-reveal="open">
			{#key step}<h2 id="stage-title">{clauses[step]()}</h2>{/key}
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
	</div>

	<div class="slider" data-reveal style:--d="300ms">
		<div class="rail" style:--passed="{(step / 3) * 100}%">
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
		<ol class="steps">
			{#each names as name, i (i)}
				<li class:current={step === i}>{name()}</li>
			{/each}
		</ol>
	</div>
</section>

<style lang="scss">
	@use 'tokens' as *;

	.stages {
		width: 100vw;
		margin-inline: calc(50% - 50vw);
		padding-bottom: 6rem;
	}

	.fields {
		display: grid;
		grid-template-columns: minmax(0, 1fr);

		@include up($bp-md) {
			grid-template-columns: 1fr 1fr;
			min-height: 30rem;
		}
	}

	// The clause sits at the foot of its field, just above the slider that changes it.
	.clause {
		display: flex;
		align-items: flex-end;
		padding: 3rem max(1rem, calc(50vw - 36rem)) 3rem;
		padding-right: 2rem;
		background: var(--accent);
		color: var(--accent-text);

		@include up($bp-md) {
			order: -1;
			padding-top: 4rem;
		}

		@media (max-width: $bp-md) {
			order: 1;
			padding-inline: 1rem;
		}
	}

	h2 {
		margin: 0;
		max-width: 12ch;
		font-size: var(--fs-display);
		font-stretch: 72%;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.02em;
		animation: swap 200ms ease-out;
	}

	@keyframes swap {
		from {
			opacity: 0;
		}
	}

	.picture {
		display: grid;
		grid-template-columns: minmax(0, 27.5rem);
		place-content: center;
		place-items: center;
		min-width: 0;
		overflow: hidden;
		padding: 3rem 1rem;
		background: var(--surface-2);
	}

	.fragment {
		grid-area: 1 / 1;
		width: min(100%, 27.5rem);
		opacity: 0;
		visibility: hidden;
		transition:
			opacity 200ms ease-out,
			visibility 0s 200ms;

		&.shown {
			opacity: 1;
			visibility: visible;
			transition: opacity 200ms ease-out;
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

	.slider {
		max-width: calc(72rem + 2rem);
		margin: 0 auto;
		padding: 1.75rem 1rem 0;
	}

	// The track is drawn under a transparent native one: grey, the passed part in ink.
	.rail {
		position: relative;
		height: 2.5rem;

		&::before,
		.passed {
			content: '';
			position: absolute;
			left: 0;
			top: calc(50% - 4px);
			height: 8px;
		}

		&::before {
			right: 0;
			background: var(--control);
		}

		.passed {
			width: var(--passed);
			background: var(--text);
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

		&::-webkit-slider-thumb {
			width: 2rem;
			height: 2rem;
			margin-top: -12px;
			border: 0;
			background: var(--accent);
			appearance: none;
		}

		&::-moz-range-thumb {
			width: 2rem;
			height: 2rem;
			border: 0;
			border-radius: 0;
			background: var(--accent);
		}
	}

	.steps {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		margin: 0.5rem 0 0;
		padding: 0;
		list-style: none;
		color: var(--text-muted);
		font-size: 1rem;

		li:nth-child(2),
		li:nth-child(3) {
			text-align: center;
		}

		li:last-child {
			text-align: right;
		}

		.current {
			color: var(--text);
			font-weight: 650;
		}
	}
</style>
