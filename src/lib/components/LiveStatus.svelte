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
		gap: 0.4rem;
		font-size: var(--fs-small);
		color: var(--text-muted);

		&::before {
			content: '';
			width: 0.5rem;
			height: 0.5rem;
			border-radius: 50%;
			background: var(--control);
		}

		&.on::before {
			background: var(--success);
		}
	}
</style>
