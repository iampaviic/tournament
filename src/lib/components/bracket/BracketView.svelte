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
		label
	}: {
		matches: BracketMatch[];
		participants: Record<string, ThemeParticipant>;
		theme: BracketTheme;
		type: StageType;
		label: string;
	} = $props();

	const layout = $derived(layoutBracket(matches));
</script>

<div class="bracket" style={themeStyle(theme.style)} data-theme={theme.id}>
	<PanZoom width={layout.width} height={layout.height} {label}>
		<BracketCanvas {layout} {participants} {theme} elimination={isElimination(type)} />
	</PanZoom>
</div>
