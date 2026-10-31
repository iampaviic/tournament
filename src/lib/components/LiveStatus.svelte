<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	/** Whether the live connection is up; `null` until it first opens or fails. */
	let { connected }: { connected: boolean | null } = $props();
</script>

<span class="live" class:on={connected === true} role="status" data-testid="live"
	>{connected === null ? m.live_connecting() : connected ? m.live_on() : m.live_off()}</span
>

<style lang="scss">
	.live {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: var(--fs-small);
		font-weight: 600;
		color: var(--text-muted);

		&::before {
			content: '';
			width: 0.55rem;
			height: 0.55rem;
			border-radius: 50%;
			background: var(--control);
		}

		&.on {
			color: var(--text);

			&::before {
				background: var(--success);
				box-shadow: 0 0 0 0 color-mix(in srgb, var(--success) 60%, transparent);
				animation: pulse 2s var(--ease-out) infinite;
			}
		}
	}

	// A ring that spreads from the dot while results stream in.
	@keyframes pulse {
		70% {
			box-shadow: 0 0 0 6px transparent;
		}
		100% {
			box-shadow: 0 0 0 0 transparent;
		}
	}
</style>
