<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Roster from '#lib/components/Roster.svelte';
	import { NAMES } from '#lib/home/demo.ts';

	// The hero's two players carry their cursors, as on the select screen before a match.
	const players = NAMES.map((name, i) => ({
		id: name,
		name,
		cursor: i === 0 ? ('p1' as const) : i === 1 ? ('p2' as const) : null
	}));
	const limit = 12;
</script>

<section class="signup" aria-labelledby="signup-title">
	<div class="copy" data-reveal>
		<h2 id="signup-title">{m.home_roster_title()}</h2>
		<p>{m.home_roster_lead()}</p>
		<p class="count">
			<span class="badge">{m.home_example()}</span>
			<span class="muted">{m.t_capacity({ count: NAMES.length, limit })}</span>
		</p>
	</div>
	<div class="grid" data-reveal="settle" style:--d="120ms">
		<Roster {players} open={limit - NAMES.length} />
	</div>
</section>

<style lang="scss">
	@use 'tokens' as *;

	.signup {
		display: grid;
		gap: 2rem;
		padding-block: 3rem 4rem;

		@include up($bp-md) {
			grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
			align-items: center;
			gap: 3.5rem;
			padding-block: 4rem 5rem;
		}
	}

	.copy {
		display: flex;
		flex-direction: column;
		gap: 1rem;

		h2 {
			margin: 0;
			font-size: var(--fs-statement);
		}

		p {
			margin: 0;
			max-width: 32rem;
			color: var(--text-muted);
			font-size: var(--fs-lead);
		}
	}

	.copy .count {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
		font-size: var(--fs-body);
	}
</style>
