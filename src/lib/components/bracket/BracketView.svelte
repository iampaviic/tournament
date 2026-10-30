<script lang="ts">
	import type { BracketMatch } from '#lib/bracketView.ts';
	import { layoutBracket } from '#lib/bracketLayout.ts';
	import type { StageType } from '#lib/brackets/index.ts';
	import { themeStyle, type BracketTheme, type ThemeParticipant } from '#lib/themes/index.ts';
	import { isElimination } from '#lib/tournaments.ts';
	import BracketCanvas from './BracketCanvas.svelte';
	import PanZoom from './PanZoom.svelte';

	let {
		matches,
		participants,
		theme,
		type,
		label,
		me = null,
		disputed = []
	}: {
		matches: BracketMatch[];
		participants: Record<string, ThemeParticipant>;
		theme: BracketTheme;
		type: StageType;
		label: string;
		/** The viewer's participant id: their line is drawn in blue. */
		me?: string | null;
		/** Matches whose reports disagree, marked in the organizer's red. */
		disputed?: string[];
	} = $props();

	const layout = $derived(layoutBracket(matches));
</script>

<!-- A sheet wider than the column takes the window's width, so it can be read whole at once. -->
<div
	class="bracket"
	style={themeStyle(theme.style)}
	style:--sheet="{layout.width + 50}px"
	data-theme={theme.id}
>
	<PanZoom width={layout.width} height={layout.height} {label}>
		<BracketCanvas
			{layout}
			{participants}
			{theme}
			{me}
			{disputed}
			elimination={isElimination(type)}
		/>
	</PanZoom>
</div>

<style>
	.bracket {
		--width: min(calc(100vw - 2rem), max(100%, var(--sheet)));
		width: var(--width);
		margin-left: calc((100% - var(--width)) / 2);
	}
</style>
