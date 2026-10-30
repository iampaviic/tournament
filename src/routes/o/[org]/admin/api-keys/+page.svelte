<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let copied = $state(false);

	async function copy(key: string) {
		await navigator.clipboard.writeText(key);
		copied = true;
	}
</script>

<p class="muted">{m.api_keys_lead()} <a href={resolve('/docs/api')}>{m.api_keys_docs()}</a></p>

{#if form?.error}
	<p class="alert error" role="alert">{form.error}</p>
{:else if form?.message}
	<p class="alert success" role="status">{form.message}</p>
{/if}

{#if form?.created}
	<div class="alert warning created" role="status">
		<p>{m.api_keys_created({ name: form.created.name })}</p>
		<div class="key">
			<code data-testid="new-api-key">{form.created.key}</code>
			<button class="btn small" type="button" onclick={() => copy(form!.created!.key)}>
				{copied ? m.api_keys_copied() : m.api_keys_copy()}
			</button>
		</div>
	</div>
{/if}

<div class="card">
	{#if data.keys.length}
		<ul class="keys">
			{#each data.keys as key (key.id)}
				<li>
					<div class="info">
						<strong>{key.name}</strong>
						<code class="muted">tm_{key.prefix}_…</code>
						<div class="muted small">
							{m.api_keys_meta({
								username: key.createdBy ?? '—',
								date: formatDate(key.createdAt)
							})} ·
							{key.lastUsedAt
								? m.api_keys_last_used({ date: formatDate(key.lastUsedAt) })
								: m.api_keys_never_used()}
						</div>
					</div>
					<form method="POST" action="?/revoke" use:enhance>
						<input type="hidden" name="id" value={key.id} />
						<button class="btn small danger" type="submit">{m.api_keys_revoke()}</button>
					</form>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted empty">{m.api_keys_empty()}</p>
	{/if}
</div>

<form
	method="POST"
	action="?/create"
	class="card create"
	use:enhance={() => {
		copied = false;
		return ({ update }) => update();
	}}
>
	<h2>{m.api_keys_create_title()}</h2>
	<div class="row">
		<div class="field grow">
			<label for="name">{m.api_keys_name()}</label>
			<input id="name" name="name" type="text" required maxlength="64" autocomplete="off" />
			<span class="hint">{m.api_keys_name_hint()}</span>
		</div>
		<button class="btn primary" type="submit">{m.api_keys_create()}</button>
	</div>
</form>

<style lang="scss">
	.created p {
		margin: 0 0 0.5rem;
	}

	.key {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;

		code {
			flex: 1;
			min-width: 0;
			overflow-wrap: anywhere;
			padding: 0.4rem 0.6rem;
			border-radius: var(--radius-sm);
			background: var(--surface);
			color: var(--text);
		}
	}

	.keys {
		list-style: none;
		margin: 0;
		padding: 0;

		li {
			display: flex;
			flex-wrap: wrap;
			justify-content: space-between;
			align-items: center;
			gap: 0.75rem;
			padding: 0.75rem 0;

			& + li {
				border-top: 1px solid var(--rule);
			}

			&:first-child {
				padding-top: 0;
			}

			&:last-child {
				padding-bottom: 0;
			}
		}
	}

	.info code {
		margin-left: 0.5rem;
	}

	.small {
		font-size: var(--fs-small);
	}

	.empty {
		margin: 0;
	}

	.create {
		margin-top: 1.5rem;

		h2 {
			font-size: var(--fs-section);
		}
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 0 0.75rem;

		.btn {
			margin-top: 1.85rem;
		}
	}

	.grow {
		flex: 1;
		min-width: 12rem;
	}
</style>
