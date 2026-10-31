<script lang="ts">
	let { size = 20 }: { size?: number } = $props();
</script>

<!-- Two sides meeting at a slanted cut, the versus screen in miniature: player one, player two. -->
<svg class="mark" width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
	<path d="M1 3H11.2L7.8 17H1Z" fill="var(--p1)" />
	<path d="M13.2 3H19V17H9.8Z" fill="var(--p2)" />
</svg>

<style lang="scss">
	.mark {
		flex: none;
	}
</style>
