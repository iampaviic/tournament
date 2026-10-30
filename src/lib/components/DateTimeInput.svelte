<script lang="ts">
	interface Props {
		id: string;
		name: string;
		value: Date | null;
	}

	let { id, name, value }: Props = $props();

	/** `YYYY-MM-DDTHH:mm` in the browser's time zone, as `datetime-local` inputs expect. */
	const toLocal = (date: Date) => {
		const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
		return shifted.toISOString().slice(0, 16);
	};

	// Recomputed when the page hydrates, so the time is shown in the browser's time zone.
	let local = $derived(value ? toLocal(value) : '');
	const iso = $derived(local ? new Date(local).toISOString() : '');
</script>

<input {id} type="datetime-local" bind:value={local} />
<input type="hidden" {name} value={iso} />
