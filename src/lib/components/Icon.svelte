<script lang="ts" module>
	/** Outline icons on a 16px grid, drawn with one 1.5px stroke. */
	const paths = {
		plus: 'M8 3v10M3 8h10',
		minus: 'M3 8h10',
		fit: 'M3 5.5V3h2.5M10.5 3H13v2.5M13 10.5V13h-2.5M5.5 13H3v-2.5M6 6h4v4H6z',
		expand: 'M9.5 3H13v3.5M13 3 9 7M6.5 13H3V9.5M3 13l4-4',
		collapse: 'M13 6.5H9.5V3M9.5 6.5 13 3M3 9.5h3.5V13M6.5 9.5 3 13',
		check: 'M3.5 8.5 6.5 11.5 12.5 4.5',
		cross: 'M4.5 4.5l7 7M11.5 4.5l-7 7',
		alert: 'M8 2.5 14 13H2L8 2.5ZM8 6.5v3M8 11.25v.25'
	} as const;
	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	let { name, size = 16, label }: { name: IconName; size?: number; label?: string } = $props();
</script>

<svg
	class="icon"
	width={size}
	height={size}
	viewBox="0 0 16 16"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	<path d={paths[name]} />
</svg>

<style lang="scss">
	.icon {
		flex: none;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
		vertical-align: -0.15em;
	}
</style>
