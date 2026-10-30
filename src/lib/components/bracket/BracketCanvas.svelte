<script lang="ts">
	import type { BracketMatch } from '#lib/bracketView.ts';
	import { CARD_WIDTH, HEADER_HEIGHT, type BracketLayout } from '#lib/bracketLayout.ts';
	import { roundTitle } from '#lib/labels.ts';
	import type { BracketTheme, ThemeParticipant } from '#lib/themes/index.ts';
	import MatchCard from './MatchCard.svelte';

	let {
		layout,
		participants,
		theme,
		elimination
	}: {
		layout: BracketLayout<BracketMatch>;
		participants: Record<string, ThemeParticipant>;
		theme: BracketTheme;
		elimination: boolean;
	} = $props();

	/** Hovering a participant highlights their way through the bracket. */
	let highlighted = $state<string | null>(null);

	const byId = $derived(new Map(layout.matches.map((p) => [p.match.template.id, p.match])));
	const onPath = (from: string, to: string) =>
		highlighted !== null &&
		byId.get(from)!.entrants.includes(highlighted) &&
		byId.get(to)!.entrants.includes(highlighted);
	/** A decided match's winner line carries on into the next round in ink. */
	const carried = (from: string) => byId.get(from)!.status === 'completed';

	function onpointerover(event: PointerEvent) {
		const slot = (event.target as Element).closest('[data-entrant]');
		highlighted = slot?.getAttribute('data-entrant') ?? null;
	}
</script>

<div
	class="canvas"
	style:width="{layout.width}px"
	style:height="{layout.height}px"
	role="presentation"
	{onpointerover}
	onpointerleave={() => (highlighted = null)}
>
	<svg class="lines" width={layout.width} height={layout.height} aria-hidden="true">
		{#each layout.connectors as connector (`${connector.from}>${connector.to}`)}
			<path
				d={connector.path}
				class:carried={carried(connector.from)}
				class:highlighted={onPath(connector.from, connector.to)}
			/>
		{/each}
	</svg>

	{#each layout.headers as header (`${header.side}${header.round}`)}
		<div
			class="header"
			style:left="{header.x}px"
			style:top="{header.y}px"
			style:width="{CARD_WIDTH}px"
			style:height="{HEADER_HEIGHT}px"
		>
			{roundTitle(header, elimination)}
		</div>
	{/each}

	{#each layout.matches as placed (placed.match.id)}
		<MatchCard {placed} {participants} {theme} {highlighted} />
	{/each}
</div>

<style lang="scss">
	.canvas {
		position: relative;
		color: var(--bracket-text);
		font-family: var(--bracket-font);
	}

	.lines {
		position: absolute;
		inset: 0;
		overflow: visible;

		path {
			fill: none;
			stroke: var(--bracket-line);
			stroke-width: 1;
		}

		path.carried {
			stroke: var(--bracket-ink);
			stroke-width: 2;
		}

		path.highlighted {
			stroke: var(--bracket-highlight);
			stroke-width: 2;
		}
	}

	.header {
		position: absolute;
		display: flex;
		align-items: center;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--bracket-muted);
		white-space: nowrap;
	}
</style>
