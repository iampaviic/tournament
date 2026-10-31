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
		margin-bottom: 1rem;
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
</style>
