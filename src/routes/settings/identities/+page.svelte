<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const error = $derived(form && 'error' in form ? form.error : data.error);
	const linkHref = (moduleId: string) =>
		`/auth/${moduleId}/login?intent=link&next=${encodeURIComponent('/settings/identities')}`;
</script>

<p class="muted">{m.identities_lead()}</p>

{#if error}
	<p class="alert error" role="alert">{error}</p>
{:else if form && 'message' in form}
	<p class="alert success" role="status">{form.message}</p>
{/if}

<p class="alert" class:warning={!data.session.trusted}>
	{m.identities_session({ module: data.session.module })}
	{#if !data.session.trusted}{m.identities_session_untrusted()}{/if}
</p>

<ul>
	{#each data.modules as module (module.id)}
		<li class="card">
			<div class="who">
				{#if module.identity}
					<Avatar src={module.identity.avatarUrl} name={module.identity.username} size={40} />
				{/if}
				<div>
					<h2>
						{module.name}
						{#if module.trusted}<span class="badge success">{m.identities_secure()}</span>{/if}
					</h2>
					{#if module.identity}
						<p class="muted">{m.identities_linked_as({ username: module.identity.username })}</p>
						{#if Object.keys(module.identity.fields).length}
							<dl>
								{#each Object.entries(module.identity.fields) as [key, value] (key)}
									<dt>{key}</dt>
									<dd>{value}</dd>
								{/each}
							</dl>
						{/if}
					{:else}
						<p class="muted">{m.identities_not_linked()}</p>
					{/if}
				</div>
			</div>

			<div class="actions">
				{#if module.identity}
					{#if module.refreshable}
						<form method="POST" action="?/refresh" use:enhance>
							<input type="hidden" name="module" value={module.id} />
							<button class="btn small" type="submit">{m.identities_refresh()}</button>
						</form>
					{/if}
					<form method="POST" action="?/unlink" use:enhance>
						<input type="hidden" name="module" value={module.id} />
						<button class="btn small danger" type="submit">{m.identities_unlink()}</button>
					</form>
				{:else if module.id !== 'dev'}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- server endpoint that redirects to the provider -->
					<a class="btn small primary" href={linkHref(module.id)} data-sveltekit-reload>
						{m.identities_link()}
					</a>
				{/if}
			</div>
		</li>
	{/each}
</ul>

<style lang="scss">
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.who {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	h2 {
		font-size: 1rem;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	p {
		margin: 0;
	}

	dl {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin: 0.25rem 0 0;
		font-size: var(--fs-body);
	}

	dt {
		color: var(--text-muted);
		font-size: var(--fs-small);
		align-self: center;
	}

	dd {
		margin: 0 0 0 -0.6rem;
		font-weight: 600;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
