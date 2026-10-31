<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';

	// Dark is the default look. The choice is kept in this browser and applied before the page paints
	// (see app.html), so the switch only has to read it back and flip it.
	let light = $state(false);

	onMount(() => {
		light = document.documentElement.dataset.theme === 'light';
	});

	function toggle() {
		light = !light;
		if (light) document.documentElement.dataset.theme = 'light';
		else delete document.documentElement.dataset.theme;
		try {
			localStorage.setItem('theme', light ? 'light' : 'dark');
		} catch {
			// Private windows may refuse storage; the switch still works for this page.
		}
	}
</script>

<!-- Names the look it switches to. -->
<button class="btn small" type="button" onclick={toggle}>
	{light ? m.theme_dark() : m.theme_light()}
</button>
