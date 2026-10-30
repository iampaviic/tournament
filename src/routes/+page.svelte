<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<section class="hero">
	<h1>{m.home_title()}</h1>
	<p class="muted">{m.home_lead()}</p>
	{#if data.user}
		<a class="btn primary" href={resolve('/dashboard')}>{m.home_cta_dashboard()}</a>
	{:else}
		<a class="btn primary" href={resolve('/login')}>{m.home_cta_login()}</a>
	{/if}
</section>

<style lang="scss">
	.hero {
		max-width: 40rem;
		margin: 4rem auto;
		text-align: center;

		h1 {
			font-size: clamp(2rem, 5vw, 3rem);
		}

		p {
			font-size: 1.15rem;
			margin-bottom: 2rem;
		}
	}
</style>
