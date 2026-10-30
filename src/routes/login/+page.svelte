<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const loginHref = (moduleId: string) =>
		`/auth/${moduleId}/login${data.next ? `?next=${encodeURIComponent(data.next)}` : ''}`;
</script>

<svelte:head>
	<title>{m.login_title()} · {m.app_name()}</title>
</svelte:head>

<div class="card login">
	<h1>{m.login_title()}</h1>
	<p class="muted">{m.login_lead()}</p>

	{#if data.error}
		<p class="alert error" role="alert">{data.error}</p>
	{/if}

	<ul>
		{#each data.modules as module (module.id)}
			<li>
				{#if module.id === 'dev'}
					<form method="GET" action="/auth/dev/login" class="dev" data-sveltekit-reload>
						<div class="field">
							<label for="dev-username">{m.login_dev_username()}</label>
							<input id="dev-username" name="username" type="text" required autocomplete="off" />
						</div>
						{#if data.next}<input type="hidden" name="next" value={data.next} />{/if}
						<button class="btn primary" type="submit">{m.login_dev_submit()}</button>
					</form>
				{:else}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- server endpoint that redirects to the provider -->
					<a class="btn" href={loginHref(module.id)} data-sveltekit-reload>
						{m.login_continue_with({ name: module.name })}
					</a>
				{/if}
				{#if !module.trusted}
					<p class="hint muted">{m.login_insecure()}</p>
				{/if}
			</li>
		{/each}
	</ul>
</div>

<style lang="scss">
	.login {
		max-width: 26rem;
		margin: 3rem auto;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 1.5rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	li > .btn {
		width: 100%;
	}

	.hint {
		font-size: 0.8rem;
		margin: 0.35rem 0 0;
	}
</style>
