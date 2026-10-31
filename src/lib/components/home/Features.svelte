<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	// Each is something the product does today, so each is stated, not switched on or off.
	const features = [
		{ id: 'reports', say: m.home_feature_reports, then: m.home_feature_reports_on },
		{ id: 'requirements', say: m.home_feature_requirements, then: m.home_feature_requirements_on },
		{ id: 'stages', say: m.home_feature_stages, then: m.home_feature_stages_on },
		{ id: 'api', say: m.home_feature_api, then: m.home_feature_api_on },
		{ id: 'live', say: m.home_feature_live, then: m.home_feature_live_on }
	];
</script>

<!-- Written on printed lines, the way names are on the draw: the claim, and how it works. -->
<section class="features" aria-labelledby="features-title">
	<h2 id="features-title" data-reveal>{m.home_features()}</h2>
	<ul>
		{#each features as feature, i (feature.id)}
			<li data-reveal style:--d="{60 + i * 60}ms">
				<p class="say">{feature.say()}</p>
				<p class="then">{feature.then()}</p>
			</li>
		{/each}
	</ul>
</section>

<style lang="scss">
	@use 'tokens' as *;

	.features {
		padding-block: 2rem 5rem;

		@include up($bp-md) {
			padding-block: 3rem 6rem;
		}
	}

	h2 {
		margin: 0 0 1.5rem;
		font-size: var(--fs-statement);
	}

	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--border);
	}

	li {
		display: grid;
		gap: 0.5rem 2.5rem;
		padding: 1.25rem 0 1.1rem;
		border-bottom: 1px solid var(--border);

		@include up($bp-md) {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
			align-items: baseline;
			padding-block: 1.75rem 1.5rem;
		}
	}

	p {
		margin: 0;
	}

	.say {
		font-family: var(--font-display);
		font-size: clamp(1.3rem, 2.2vw, 1.85rem);
		line-height: 1.2;
		text-wrap: balance;
	}

	.then {
		max-width: 34rem;
		color: var(--text-muted);
		font-size: var(--fs-lead);
		line-height: 1.5;
	}
</style>
