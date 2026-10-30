<script lang="ts">
	let { size = 20 }: { size?: number } = $props();
</script>

<!-- Two entrants' lines join, and the winner's line goes on: a bracket, the product's own object. -->
<svg class="mark" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
	<path d="M1 4.5H9V15.5H1" fill="none" stroke="currentColor" stroke-width="2" />
	<path d="M9 10H19" fill="none" stroke="var(--mark-accent, var(--accent))" stroke-width="2" />
</svg>

<style lang="scss">
	.mark {
		flex: none;
		color: var(--text);
	}
</style>
