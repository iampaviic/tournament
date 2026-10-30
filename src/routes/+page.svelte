<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { revealOnScroll } from '#lib/reveal.ts';
	import Close from '#lib/components/home/Close.svelte';
	import Features from '#lib/components/home/Features.svelte';
	import Formats from '#lib/components/home/Formats.svelte';
	import Hero from '#lib/components/home/Hero.svelte';
	import Stages from '#lib/components/home/Stages.svelte';

	onMount(() => revealOnScroll());
</script>

<svelte:head>
	<title>{m.app_name()}</title>
	<meta name="description" content={m.home_lead()} />
</svelte:head>

<Hero />
<Formats />
<Features />
<Stages />
<Close />
