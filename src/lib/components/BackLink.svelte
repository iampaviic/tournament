<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from './Icon.svelte';

	let {
		within,
		fallback,
		fallbackName
	}: {
		/** The section this link leaves: moving between its own pages doesn't count as where you came from. */
		within: string;
		/** Where to go when the visitor arrived here directly. */
		fallback: string;
		/** What that place is called, for the link's label. */
		fallbackName: string;
	} = $props();

	// Back goes to wherever the visitor came from before this section (a dashboard, a profile, a
	// list); arriving directly, it goes to the fallback.
	let previous = $state<string | null>(null);
	afterNavigate(({ from }) => {
		const path = from?.url.pathname;
		if (path && path !== within && !path.startsWith(`${within}/`)) {
			previous = from!.url.pathname + from!.url.search;
		}
	});
</script>

<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- a path this app served -->
<a class="back" href={previous ?? fallback}>
	<Icon name="back" />
	{previous ? m.t_back() : m.t_back_to({ name: fallbackName })}
</a>

<style lang="scss">
	// Plain enough to read as navigation, with the same press as every control.
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 32px;
		margin: -0.75rem 0 0.75rem -0.5rem;
		padding: 0 0.6rem 0 0.4rem;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		font-weight: 600;
		text-decoration: none;
		transition:
			color var(--t-hover) ease,
			background-color var(--t-hover) ease;

		&:hover {
			background: var(--surface-2);
			color: var(--text);
		}

		@media (pointer: coarse) {
			min-height: 44px;
		}
	}
</style>
