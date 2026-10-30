<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{page.status} · {m.app_name()}</title>
</svelte:head>

<section class="card error-page">
	<p class="status">{page.status}</p>
	<h1>{page.error?.message ?? m.error_title()}</h1>
	<a class="btn" href={resolve('/')}>{m.error_home()}</a>
</section>

<style lang="scss">
	.error-page {
		max-width: 32rem;
		margin: 3rem auto;
		text-align: center;
	}

	.status {
		margin: 0;
		font-size: 3rem;
		font-weight: 700;
		color: var(--text-muted);
	}

	h1 {
		font-size: 1.25rem;
		margin-bottom: 1.5rem;
	}
</style>
