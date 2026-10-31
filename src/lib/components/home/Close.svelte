<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
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
			<button class="btn" type="submit">{m.home_start()}</button>
		</form>
	</div>
</section>

<!-- The brand mark at the scale of the page: player one's side and player two's, meeting at the cut. -->
<div class="mark" aria-hidden="true">
	<span class="p1"></span>
	<span class="p2"></span>
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
			line-height: 1.08;
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
		gap: 0.75rem;
		max-width: 31rem;

		input {
			flex: 1 1 14rem;
			min-height: 48px;
			border-color: transparent;
			font-size: 1rem;
		}

		// On the gold tile the action is the stage's ink with gold letters.
		.btn {
			min-height: 48px;
			padding: 0 1.4rem;
			border: 0;
			background: var(--accent-text);
			color: var(--accent);
			font-family: var(--font-display);
			font-weight: 400;
			font-size: 1rem;

			&:hover {
				background: color-mix(in srgb, var(--accent-text) 80%, var(--accent));
			}
		}

		:focus-visible {
			outline-color: var(--accent-text);
		}
	}

	// Two sides meeting at the cut, the 20px mark in the header at the width of the page.
	.mark {
		--cut: clamp(2rem, 7vw, 6rem);
		display: flex;
		height: clamp(4.5rem, 14vw, 10rem);
		margin-block: 5rem 1rem;
	}

	.p1,
	.p2 {
		flex: 1;
	}

	.p1 {
		flex-basis: 58%;
		background: var(--p1);
		clip-path: polygon(0 0, 100% 0, calc(100% - var(--cut)) 100%, 0 100%);
		margin-right: calc(var(--cut) / -2 + 0.5rem);
	}

	.p2 {
		background: var(--p2);
		clip-path: polygon(var(--cut) 0, 100% 0, 100% 100%, 0 100%);
		margin-left: calc(var(--cut) / -2 + 0.5rem);
	}

	// Scrolling the mark into view slides the two sides in from their edges until they meet. Without
	// scroll timelines it is simply there.
	@media (prefers-reduced-motion: no-preference) {
		@supports (animation-timeline: view()) {
			.p1,
			.p2 {
				animation: linear both;
				animation-timeline: view();
				animation-range: entry 0% entry 100%;
			}

			.p1 {
				animation-name: from-left;
			}

			.p2 {
				animation-name: from-right;
			}
		}
	}

	@keyframes from-left {
		from {
			transform: translateX(-40%);
		}
	}

	@keyframes from-right {
		from {
			transform: translateX(40%);
		}
	}
</style>
