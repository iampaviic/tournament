<script lang="ts">
	let { src, name, size = 32 }: { src?: string | null; name: string; size?: number } = $props();

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
	<span class="avatar" aria-hidden="true" style:--size="{size}px">{initials}</span>
{/if}

<style lang="scss">
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		object-fit: cover;
		background: var(--surface-2);
		color: var(--text-muted);
		font-size: calc(var(--size) * 0.4);
		font-weight: 600;
	}
</style>
