<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { Game } from '#lib/tournaments.ts';

	let {
		game,
		width = 92,
		named = true
	}: {
		game: Game;
		width?: number;
		/** Shows the name next to the image. */
		named?: boolean;
	} = $props();

	/** An empty image, shown when the artwork doesn't load, so the box stays without a broken icon. */
	const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

	// Reset for every image; set when it fails to load.
	let failed = $derived(!game.headerImage);
</script>

<span class="game">
	<img
		src={failed ? BLANK : game.headerImage}
		alt={m.game_image_alt({ name: game.name })}
		loading="lazy"
		{width}
		height={Math.round((width * 215) / 460)}
		onerror={() => (failed = true)}
	/>
	{#if named}<span class="name">{game.name}</span>{/if}
</span>

<style lang="scss">
	.game {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		max-width: 100%;
	}

	img {
		flex-shrink: 0;
		max-width: 100%;
		height: auto;
		aspect-ratio: 460 / 215;
		object-fit: cover;
		background: var(--surface-2);
		border-radius: var(--radius-tag);
	}

	.name {
		font-weight: 500;
		overflow-wrap: anywhere;
	}
</style>
