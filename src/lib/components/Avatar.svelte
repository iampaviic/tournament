<script lang="ts">
	let { src, name, size = 32 }: { src?: string | null; name: string; size?: number } = $props();

	// Without a picture, a player gets a character tile: a colour picked from their name.
	const tile = $derived(
		`var(--tile-${([...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 8) + 1})`
	);
	const initials = $derived(
		name
			.split(/\s+/)
			.map((part) => part[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
</script>

{#if src}
	<img class="avatar" {src} alt="" width={size} height={size} style:--size="{size}px" />
{:else}
	<span class="avatar tile" aria-hidden="true" style:--size="{size}px" style:--tile={tile}
		>{initials}</span
	>
{/if}

<style lang="scss">
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--size);
		height: var(--size);
		border-radius: calc(var(--size) * 0.22);
		object-fit: cover;
		background: var(--surface-2);
	}

	.tile {
		background: var(--tile);
		color: var(--accent-text);
		font-family: var(--font-display);
		font-size: calc(var(--size) * 0.4);
		line-height: 1;
	}
</style>
