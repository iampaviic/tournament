<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import ScoreLines from '#lib/components/ScoreLines.svelte';
	import Versus from '#lib/components/Versus.svelte';
	import { formatScore } from '#lib/format.ts';

	// The live thing: report the example match and the winner takes the screen.
	let scores = $state<[number | null, number | null]>([2, 1]);
	let reported = $state<0 | 1 | null>(null);
	const [a, b] = $derived(scores);
	const winner = $derived(a === null || b === null || a === b ? null : a > b ? 0 : 1);
	const names: [string, string] = ['Aiko', 'Bram'];
</script>

<section class="hero" aria-labelledby="home-title">
	<h1 id="home-title">
		<span class="line"><span style:--i="0">{m.home_title_1()}</span></span>
		<span class="line gold"><span style:--i="1">{m.home_title_2()}</span></span>
	</h1>
	<div class="copy">
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
				<button class="btn primary" type="submit">{m.home_start()}</button>
			</div>
		</form>
	</div>

	<div class="play" role="group" aria-label={m.home_joint_label()}>
		<p class="head">
			<span>{m.home_play_match()}</span>
			<span class="badge">{m.home_example()}</span>
		</p>
		<!-- While a score is typed the pips show it half lit; reporting it decides the match. -->
		<Versus {names} intro scores={[a, b]} pending={reported === null} winner={reported} me={0} />
		<div class="report" aria-live="polite">
			{#if reported === null}
				<ScoreLines {names} {scores} onscores={(next) => (scores = next)} />
				<button
					class="btn primary"
					type="button"
					disabled={winner === null}
					onclick={() => (reported = winner)}
				>
					{m.home_report({ score: a === null || b === null ? '–' : formatScore([a, b]) })}
				</button>
			{:else}
				<p class="note">{reported === 0 ? m.home_reported() : m.home_reported_other()}</p>
				<button class="btn" type="button" onclick={() => (reported = null)}>
					{m.home_again()}
				</button>
			{/if}
		</div>
	</div>
</section>

<style lang="scss">
	@use 'tokens' as *;

	// The title runs the full column; under it the offer on the left and the match on the right.
	.hero {
		display: grid;
		gap: 2rem;
		padding-block: 0.5rem 3rem;

		@include up($bp-md) {
			grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
			align-items: start;
			gap: 2.5rem 3.5rem;
			padding-block: 1rem 3rem;

			h1 {
				grid-column: 1 / -1;
			}
		}
	}

	.copy {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;

		@include up($bp-md) {
			padding-top: 2.6rem;
		}
	}

	h1 {
		margin: 0;
		font-size: var(--fs-display);
		line-height: 1.04;

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

		.gold {
			color: var(--accent-display);
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

	.lead {
		margin: 0;
		max-width: 34rem;
		color: var(--text-muted);
		font-size: var(--fs-lead);
		line-height: 1.55;
	}

	.start {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 31rem;

		label {
			font-weight: 600;
		}
	}

	.start-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;

		input {
			flex: 1 1 14rem;
			min-height: 48px;
			font-size: 1rem;
		}

		.btn {
			min-height: 48px;
			padding: 0 1.4rem;
			font-size: 1rem;
		}
	}

	.play {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		min-width: 0;
	}

	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.75rem;
		margin: 0;
		color: var(--text-muted);
		font-size: var(--fs-small);
	}

	.report {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 84px;

		.btn.primary {
			min-height: 44px;
			padding: 0 1.25rem;
		}
	}

	.note {
		margin: 0;
		font-weight: 600;
	}
</style>
