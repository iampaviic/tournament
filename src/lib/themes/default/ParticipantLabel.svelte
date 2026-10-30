<script lang="ts">
	import type { ParticipantLabelProps } from '../types';

	let { participant }: ParticipantLabelProps = $props();
</script>

<span class="name">{participant.name}</span>

<style lang="scss">
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
