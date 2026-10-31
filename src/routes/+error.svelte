<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{page.status} · {m.app_name()}</title>
</svelte:head>

<section class="card error-page">
	<!-- The status set like a versus score: player one's colour, gold, player two's. -->
	<p class="status">
		{#each String(page.status) as digit, i (i)}<span>{digit}</span>{/each}
	</p>
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
		margin: 0 0 0.5rem;
		font-family: var(--font-display);
		font-size: clamp(4rem, 14vw, 6rem);
		line-height: 1;

		span:nth-child(1) {
			color: var(--p1);
		}

		span:nth-child(2) {
			color: var(--accent);
		}

		span:nth-child(3) {
			color: var(--p2);
		}
	}

	h1 {
		font-size: var(--fs-section);
		margin-bottom: 1.5rem;
	}
</style>
