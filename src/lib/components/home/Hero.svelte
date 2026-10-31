<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import Mark from '#lib/components/Mark.svelte';
	import MatchLines from '#lib/components/MatchLines.svelte';
	import ScoreLines from '#lib/components/ScoreLines.svelte';
	import { formatScore } from '#lib/format.ts';
	import { matchStatusLabel } from '#lib/labels.ts';

	// The live thing: report the example match and the winner's line carries on to the right.
	let scores = $state<[number | null, number | null]>([2, 1]);
	let reported = $state<0 | 1 | null>(null);
	const [a, b] = $derived(scores);
	const winner = $derived(a === null || b === null || a === b ? null : a > b ? 0 : 1);
	const names: [string, string] = ['Aiko', 'Bram'];
</script>

<section class="hero" aria-labelledby="home-title">
	<div class="copy">
		<h1 id="home-title">
			<span class="line"><span style:--i="0">{m.home_title_1()}</span></span>
			<span class="line"><span style:--i="1">{m.home_title_2()}</span></span>
		</h1>
		<p class="lead" style:--d="420ms">{m.home_lead()}</p>
		<form class="start" style:--d="480ms" method="GET" action={resolve('/organizations/new')}>
			<label for="org-name">{m.home_org_label()}</label>
			<div class="start-row">
				<input
					id="org-name"
					name="name"
					type="text"
					maxlength="80"
					autocomplete="organization"
					placeholder={m.home_org_placeholder()}
				/>
				<button class="btn primary" type="submit">
					<Mark size={16} />
					{m.home_start()}
				</button>
			</div>
		</form>
	</div>

	<div class="joint" role="group" aria-label={m.home_joint_label()}>
		<div class="arm play">
			<h2 class="arm-label">{m.home_play()}</h2>
			<div class="sheet" data-ui>
				<p class="sheet-head">
					<span>{m.home_play_match()}</span>
					<span class="badge">{m.home_example()}</span>
				</p>
				{#if reported === null}
					<div class="report">
						<ScoreLines {names} {scores} onscores={(next) => (scores = next)} />
						<button
							class="btn primary small"
							type="button"
							disabled={winner === null}
							onclick={() => (reported = winner)}
						>
							{m.home_report({ score: a === null || b === null ? '–' : formatScore([a, b]) })}
						</button>
					</div>
				{:else}
					<MatchLines
						sides={[
							{ name: names[0], score: a },
							{ name: names[1], score: b }
						]}
						winner={reported}
						me={0}
					/>
					<p class="note">
						{reported === 0 ? m.home_reported() : m.home_reported_other()}
						<button class="again" type="button" onclick={() => (reported = null)}>
							{m.home_again()}
						</button>
					</p>
				{/if}
			</div>
		</div>

		<div class="arm run">
			<h2 class="arm-label">{m.home_run()}</h2>
			<div class="sheet" data-ui>
				<p class="sheet-head">
					<span>{m.home_run_match()}</span>
					<span class="badge danger">{matchStatusLabel('disputed')}</span>
				</p>
				<MatchLines sides={[{ name: 'Cleo' }, { name: 'Dario' }]} disputed />
				<p class="reports">
					<span>{m.room_reported({ name: 'Cleo', score: '2–1' })}</span>
					<span>{m.room_reported({ name: 'Dario', score: '1–2' })}</span>
				</p>
				<p class="note">{m.home_run_note()}</p>
			</div>
		</div>

		<div class="bar" aria-hidden="true"></div>
		<p class="carry" class:won={reported !== null} aria-live="polite">
			{#key reported}
				<span class="carry-name">
					{reported === null ? m.home_carry_waiting() : names[reported]}
				</span>
			{/key}
			{#if reported !== null}<span class="carry-into">{m.home_carry_into()}</span>{/if}
		</p>
	</div>
</section>

<style lang="scss">
	@use 'tokens' as *;

	// Full bleed, so the joint can run off the right edge of the window.
	.hero {
		display: grid;
		grid-template-columns:
			[full-start] minmax(1rem, 1fr)
			[content-start] minmax(0, 72rem)
			minmax(1rem, 1fr) [full-end];
		gap: 2.5rem 0;
		width: 100vw;
		margin: -1rem calc(50% - 50vw) 0;
		padding-bottom: 1rem;
		overflow: hidden;

		@include up($bp-md) {
			grid-template-columns:
				[full-start] minmax(1rem, 1fr)
				[content-start] minmax(0, 34rem)
				[joint-start] minmax(0, 38rem)
				minmax(1rem, 1fr) [full-end];
			align-items: center;
			min-height: min(46rem, calc(100svh - 48px));
			padding-block: 1rem 3rem;
		}
	}

	.copy {
		grid-column: content-start / span 1;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding-right: 2rem;

		@include up($bp-md) {
			grid-column: content-start / joint-start;
		}
	}

	h1 {
		margin: 0;
		font-size: var(--fs-display);
		font-stretch: 72%;
		font-weight: 800;
		line-height: 0.95;
		letter-spacing: -0.03em;

		// Each line rises from behind its own baseline; the padding keeps descenders out of the mask.
		.line {
			display: block;
			overflow: hidden;
			padding-bottom: 0.08em;
			margin-bottom: -0.08em;

			> span {
				display: block;
			}
		}
	}

	// The load sequence: everything is painted on the first frame and settled by 1.2s.
	@media (prefers-reduced-motion: no-preference) {
		:global(.js) .line > span {
			transform: translateY(105%);
			animation: line-up 800ms var(--ease-expo) forwards;
			animation-delay: calc(100ms + var(--i) * 90ms);
		}

		:global(.js) .lead,
		:global(.js) .start {
			opacity: 0;
			transform: translateY(12px);
			animation: rise 500ms var(--ease-out) forwards;
			animation-delay: var(--d);
		}

		// The joint draws itself the way the line runs: from the arms to the line that carries on.
		:global(.js) .joint {
			clip-path: inset(0 100% 0 0);
			animation: draw 1000ms var(--ease-in-out) 150ms forwards;
		}
	}

	@keyframes line-up {
		to {
			transform: none;
		}
	}

	@keyframes rise {
		to {
			opacity: 1;
			transform: none;
		}
	}

	@keyframes draw {
		to {
			clip-path: inset(0);
		}
	}

	.lead {
		margin: 0;
		max-width: 34rem;
		font-size: var(--fs-lead);
		line-height: 1.5;
	}

	.start {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 30rem;

		label {
			font-weight: 600;
		}
	}

	.start-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;

		input {
			flex: 1 1 14rem;
			min-height: 44px;
			font-size: 1rem;
		}

		.btn {
			min-height: 44px;
			padding: 0 1.1rem;
			font-size: 1rem;
			--mark-accent: var(--accent-text);
		}
	}

	// The giant joint: two arms, the bar that joins them and the line that carries on.
	.joint {
		grid-column: full-start / full-end;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 0.5rem;
		color: var(--accent-text);

		@include up($bp-md) {
			grid-column: joint-start / full-end;
			grid-template-columns: [arm] minmax(0, 1fr) [bar] 2.75rem [carry] clamp(10rem, 16vw, 16rem);
			grid-template-rows: [play] auto [gap] 5.5rem [run] auto;
			gap: 0;
		}
	}

	.arm {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.5rem 1rem;
		background: var(--accent);

		@include up($bp-md) {
			grid-column: arm / carry;
			padding: 1.75rem 4.25rem 1.75rem 2rem;
		}
	}

	.play {
		@include up($bp-md) {
			grid-row: play;
		}
	}

	// On a phone the joint stacks, and the line that carries on stays between its two arms.
	.run {
		@media (max-width: $bp-md) {
			order: 2;
		}

		@include up($bp-md) {
			grid-row: run;
		}
	}

	.arm-label {
		margin: 0;
		color: var(--accent-text);
		font-size: var(--fs-lead);
		font-weight: 700;
	}

	.sheet {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 26rem;
		padding: 1rem 1.25rem 1.1rem;
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		font-size: 1rem;
	}

	.sheet-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin: 0;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	// Laid out as the match room's score form: the lines, then the button at their foot.
	.report {
		display: flex;
		align-items: flex-end;
		gap: 1.25rem;

		.btn {
			margin-left: auto;
		}
	}

	.note,
	.reports {
		margin: 0;
		font-size: 0.875rem;
	}

	.reports {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1rem;
	}

	.note {
		color: var(--text-muted);
	}

	.again {
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent);
		font: inherit;
		text-decoration: underline;
		text-underline-offset: 0.2em;
		cursor: pointer;
	}

	.bar {
		display: none;

		@include up($bp-md) {
			display: block;
			grid-column: bar;
			grid-row: play / span 3;
			background: var(--accent);
		}
	}

	.carry {
		@media (max-width: $bp-md) {
			order: 1;
		}

		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 0.15rem;
		margin: 0;
		padding: 1rem;
		background: var(--accent);
		font-stretch: 80%;

		@include up($bp-md) {
			grid-column: carry;
			grid-row: gap;
			padding: 0 1.25rem;
		}
	}

	.carry-name {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.1;
		opacity: 0.8;
		animation: carry-in 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}

	.won .carry-name {
		opacity: 1;
	}

	.carry-into {
		font-size: 0.875rem;
		font-stretch: 100%;
	}

	@keyframes carry-in {
		from {
			transform: translateX(-1.5rem);
			opacity: 0;
		}
	}
</style>
