<script lang="ts">
	import Avatar from '#lib/components/Avatar.svelte';
	import type { ParticipantLabelProps } from '../types';

	let { participant }: ParticipantLabelProps = $props();
</script>

<span class="label">
	<Avatar src={participant.avatarUrl} name={participant.name} size={18} />
	<span class="name">{participant.name}</span>
</span>

<style lang="scss">
	.label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
