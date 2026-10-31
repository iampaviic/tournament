<script lang="ts" module>
	export interface RosterPlayer {
		id: string;
		name: string;
		avatarUrl?: string | null;
		/** Their profile, when they have one. */
		href?: string;
		/** A final placing, shown in the tile's corner. */
		rank?: number | null;
		/** A frame like a select screen's cursor: player one's, player two's, or the viewer's. */
		cursor?: 'p1' | 'p2' | 'you' | null;
	}
</script>

<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let {
		players,
		open = 0
	}: {
		players: RosterPlayer[];
		/** Places still free: drawn as empty tiles, up to a row's worth, then counted. */
		open?: number;
	} = $props();

	const shown = $derived(Math.min(open, 6));
	const tile = (name: string) =>
		`var(--tile-${([...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 8) + 1})`;
	const cursorLabel = (cursor: RosterPlayer['cursor']) =>
		cursor === 'you'
			? m.versus_you()
			: cursor
				? m.versus_side({ side: cursor === 'p1' ? 1 : 2 })
				: '';
</script>

<!-- The roster as a select screen: one tile per player, open places still empty. -->
<ol class="roster">
	{#each players as player (player.id)}
		<li class="tile {player.cursor ?? ''}" style:--tile={tile(player.name)}>
			<svelte:element this={player.href ? 'a' : 'span'} class="face" href={player.href}>
				{#if player.avatarUrl}
					<img src={player.avatarUrl} alt="" />
				{:else}
					<span class="letter" aria-hidden="true">{[...player.name][0]?.toUpperCase()}</span>
				{/if}
				<span class="name">{player.name}</span>
			</svelte:element>
			{#if player.cursor}<span class="cursor">{cursorLabel(player.cursor)}</span>{/if}
			{#if player.rank}<span class="rank">{player.rank}</span>{/if}
		</li>
	{/each}
	{#each Array.from({ length: shown }, (_, i) => i) as i (i)}
		<li class="tile empty" aria-hidden="true"></li>
	{/each}
	{#if open > shown}
		<li class="tile more">
			<span>{m.roster_more_open({ count: open - shown })}</span>
		</li>
	{/if}
</ol>

<style lang="scss">
	@use 'tokens' as *;

	.roster {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
		gap: 0.6rem;
		margin: 0;
		padding: 0;
		list-style: none;

		@include up($bp-sm) {
			grid-template-columns: repeat(auto-fill, minmax(7.75rem, 1fr));
		}
	}

	// A tile is a panel with a clear edge; only its picture area carries the player's colour, so no
	// colour sits behind the name and leaks at the corners. The 3px around the panel is the cursor
	// frame's room: transparent, or a solid ring in the cursor's colour, never an outline that a
	// neighbour or the page could clip.
	.tile {
		position: relative;
		aspect-ratio: 1 / 1.1;
		padding: 3px;
		border-radius: calc(var(--radius-sm) + 3px);
	}

	.face {
		display: grid;
		grid-template-rows: minmax(0, 1fr) auto;
		height: 100%;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--accent-text);
		text-decoration: none;
		transition:
			transform var(--t-press) var(--ease-out),
			border-color var(--t-hover) ease;

		img {
			width: 100%;
			height: 100%;
			min-height: 0;
			object-fit: cover;
		}
	}

	a.face:hover {
		border-color: var(--line);
		transform: translateY(-2px);
	}

	.letter {
		display: grid;
		place-items: center;
		background: var(--tile);
		font-family: var(--font-display);
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		line-height: 1;
	}

	.name {
		padding: 0.35rem 0.55rem;
		overflow: hidden;
		color: var(--text);
		font-weight: 700;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	// The cursor frames: player one's and player two's colours, gold for the viewer.
	.p1,
	.p2,
	.you {
		--frame: var(--p1);
		background: var(--frame);
	}

	.p2 {
		--frame: var(--p2);
	}

	.you {
		--frame: var(--accent);
	}

	.cursor,
	.rank {
		position: absolute;
		top: calc(3px + 0.35rem);
		padding: 0.05rem 0.4rem;
		border-radius: var(--radius-tag);
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1.4;
	}

	.cursor {
		right: calc(3px + 0.35rem);
		background: var(--frame);
		color: var(--on-side);
	}

	.you .cursor {
		color: var(--accent-text);
	}

	.rank {
		left: calc(3px + 0.35rem);
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-display);
		font-weight: 400;
	}

	// A place nobody has taken yet: drawn inside the same frame room as a face, so it lines up.
	.empty::before,
	.more::before {
		content: '';
		position: absolute;
		inset: 3px;
		border: 2px dashed var(--control);
		border-radius: var(--radius-sm);
	}

	.more {
		display: grid;
		place-items: center;
		padding: 0.5rem;
		color: var(--text-muted);
		font-weight: 600;
		text-align: center;
	}
</style>
