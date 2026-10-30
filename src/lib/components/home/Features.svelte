<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	const features = [
		{
			id: 'reports',
			say: m.home_feature_reports,
			then: m.home_feature_reports_on,
			tint: '--accent-soft'
		},
		{
			id: 'requirements',
			say: m.home_feature_requirements,
			then: m.home_feature_requirements_on,
			tint: '--success-soft'
		},
		{
			id: 'stages',
			say: m.home_feature_stages,
			then: m.home_feature_stages_on,
			tint: '--warning-bg'
		},
		{ id: 'api', say: m.home_feature_api, then: m.home_feature_api_on, tint: '--accent-track' },
		{ id: 'live', say: m.home_feature_live, then: m.home_feature_live_on, tint: '--danger-soft' }
	];
	let on = $state<Record<string, boolean>>({ reports: true, api: true });
</script>

<section class="features" aria-labelledby="features-title">
	<h2 id="features-title" class="visually-hidden">{m.home_features()}</h2>
	{#each features as feature (feature.id)}
		{@const active = Boolean(on[feature.id])}
		<div class="band" class:on={active} style:--tint="var({feature.tint})">
			<div class="inner">
				<div class="words" data-reveal style:--rise="16px">
					<p class="say" id="feature-{feature.id}">{feature.say()}</p>
					{#if active}<p class="then">{feature.then()}</p>{/if}
				</div>
				<span class="toggle" data-reveal style:--rise="16px" style:--d="90ms">
					<button
						class="switch"
						type="button"
						role="switch"
						aria-checked={active}
						aria-labelledby="feature-{feature.id}"
						data-ui
						onclick={() => (on = { ...on, [feature.id]: !active })}
					>
						<span class="knob"></span>
					</button>
				</span>
			</div>
		</div>
	{/each}
</section>

<style lang="scss">
	@use 'tokens' as *;

	.features {
		width: 100vw;
		margin-inline: calc(50% - 50vw);
	}

	.band {
		background: var(--bg);
		transition: background-color 280ms ease-out;

		&.on {
			background: var(--tint);
		}

		// Off bands sit one tone step apart, so neighbours read as two without a rule.
		&:nth-child(odd):not(.on) {
			background: var(--surface-2);
		}
	}

	.inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		max-width: calc(72rem + 2rem);
		min-height: max(8.5rem, 18vh);
		margin-inline: auto;
		padding: 1.5rem 1rem;
	}

	.words {
		min-width: 0;
	}

	.say {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--fs-statement);
		font-stretch: 80%;
		font-weight: 750;
		line-height: 1.15;
		transition: color 280ms ease-out;

		.on & {
			color: var(--text);
		}
	}

	.then {
		max-width: 44rem;
		margin: 0.5rem 0 0;
		font-size: var(--fs-lead);
		animation: then-in 280ms ease-out;
	}

	@keyframes then-in {
		from {
			opacity: 0;
			transform: translateY(-0.5rem);
		}
	}

	.toggle {
		flex: none;
		display: flex;
	}

	.switch {
		position: relative;
		width: 3.5rem;
		height: 2rem;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: var(--control);
		cursor: pointer;
		transition: background-color 200ms ease-out;

		&[aria-checked='true'] {
			background: var(--accent);

			.knob {
				transform: translateX(1.5rem);
			}
		}
	}

	.knob {
		position: absolute;
		top: 0.25rem;
		left: 0.25rem;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		background: var(--surface);
		transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
</style>
