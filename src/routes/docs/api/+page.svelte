<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tagId = (name: string) => `tag-${name.toLowerCase()}`;
	const curl = $derived(
		`curl -H "Authorization: Bearer tm_…" ${page.url.origin}/api/v1/tournaments`
	);
	const envelope = JSON.stringify(
		{
			error: {
				code: 'invalid_request',
				message: 'Name is required.',
				issues: [{ path: ['name'], message: 'Name is required.' }]
			}
		},
		null,
		2
	);
</script>

<svelte:head>
	<title>{m.api_docs_title()} · {m.app_name()}</title>
</svelte:head>

{#snippet typeOf(value: { type: string | null; ref: string | null })}
	{#if value.ref}
		<a href="#schema-{value.ref}"><code>{value.type}</code></a>
	{:else}
		<code>{value.type}</code>
	{/if}
{/snippet}

<h1>{m.api_docs_title()}</h1>
<p class="muted lead">{m.api_docs_lead()}</p>

<nav class="card contents" aria-label={m.api_docs_contents()}>
	<ul>
		<li><a href="#auth">{m.api_docs_auth_title()}</a></li>
		<li><a href="#errors">{m.api_docs_errors_title()}</a></li>
		{#each data.reference.tags as tag (tag.name)}
			<li><a href="#{tagId(tag.name)}">{tag.name}</a></li>
		{/each}
		<li><a href="#schemas">{m.api_docs_schemas()}</a></li>
	</ul>
</nav>

<section aria-labelledby="auth">
	<h2 id="auth">{m.api_docs_auth_title()}</h2>
	<p>{m.api_docs_auth_create()}</p>
	<p>{m.api_docs_auth_header()}</p>
	<pre><code>Authorization: Bearer tm_&lt;prefix&gt;_&lt;secret&gt;</code></pre>
	<h3>{m.api_docs_example()}</h3>
	<pre><code>{curl}</code></pre>
	<p>{m.api_docs_auth_scope()}</p>
	<p>
		{m.api_docs_spec_lead()}
		<a href={resolve('/api/v1/openapi.json')}>{m.api_docs_spec()}</a>
	</p>
</section>

<section aria-labelledby="errors">
	<h2 id="errors">{m.api_docs_errors_title()}</h2>
	<p>{m.api_docs_errors_lead()}</p>
	<pre><code>{envelope}</code></pre>
	<div class="table">
		<table>
			<thead>
				<tr>
					<th scope="col">{m.api_docs_status()}</th>
					<th scope="col">{m.api_docs_code()}</th>
				</tr>
			</thead>
			<tbody>
				{#each data.errors as row (row.status)}
					<tr>
						<td>{row.status}</td>
						<td><code>{row.code}</code></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

{#each data.reference.tags as tag (tag.name)}
	<section aria-labelledby={tagId(tag.name)}>
		<h2 id={tagId(tag.name)}>{tag.name}</h2>
		<p class="muted">{tag.description}</p>

		{#each tag.operations as operation (operation.id)}
			<article class="card operation" id="op-{operation.id}">
				<h3><span class="method">{operation.method}</span> <code>{operation.path}</code></h3>
				<p>{operation.summary}</p>
				{#if operation.description}<p class="muted">{operation.description}</p>{/if}

				{#if operation.parameters.length}
					<h4>{m.api_docs_parameters()}</h4>
					<div class="table">
						<table>
							<thead>
								<tr>
									<th scope="col">{m.api_docs_name()}</th>
									<th scope="col">{m.api_docs_in()}</th>
									<th scope="col">{m.api_docs_type()}</th>
									<th scope="col">{m.api_docs_required()}</th>
									<th scope="col">{m.api_docs_description()}</th>
								</tr>
							</thead>
							<tbody>
								{#each operation.parameters as parameter (parameter.name)}
									<tr>
										<td><code>{parameter.name}</code></td>
										<td>{parameter.in}</td>
										<td>{@render typeOf(parameter)}</td>
										<td>{parameter.required ? m.api_docs_yes() : ''}</td>
										<td>{parameter.description ?? ''}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				{#if operation.body}
					<h4>{m.api_docs_request_body()}</h4>
					<p>{@render typeOf(operation.body)}</p>
				{/if}

				<h4>{m.api_docs_responses()}</h4>
				<div class="table">
					<table>
						<thead>
							<tr>
								<th scope="col">{m.api_docs_status()}</th>
								<th scope="col">{m.api_docs_description()}</th>
								<th scope="col">{m.api_docs_type()}</th>
							</tr>
						</thead>
						<tbody>
							{#each operation.responses as response (response.status)}
								<tr>
									<td>{response.status}</td>
									<td>{response.description}</td>
									<td>
										{#if response.type}
											{@render typeOf(response)}
										{:else}
											<span class="muted">{m.api_docs_no_content()}</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</article>
		{/each}
	</section>
{/each}

<section aria-labelledby="schemas">
	<h2 id="schemas">{m.api_docs_schemas()}</h2>
	{#each data.reference.schemas as schema (schema.name)}
		<article class="card operation" id="schema-{schema.name}">
			<h3><code>{schema.name}</code></h3>
			{#if schema.description}<p class="muted">{schema.description}</p>{/if}

			{#if schema.fields.length}
				<div class="table">
					<table>
						<thead>
							<tr>
								<th scope="col">{m.api_docs_name()}</th>
								<th scope="col">{m.api_docs_type()}</th>
								<th scope="col">{m.api_docs_required()}</th>
								<th scope="col">{m.api_docs_description()}</th>
							</tr>
						</thead>
						<tbody>
							{#each schema.fields as field (field.name)}
								<tr>
									<td><code>{field.name}</code></td>
									<td>{@render typeOf(field)}</td>
									<td>{field.required ? m.api_docs_yes() : ''}</td>
									<td>{field.description ?? ''}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p><code>{schema.type}</code></p>
			{/if}

			<details>
				<summary>{m.api_docs_json_schema()}</summary>
				<pre><code>{schema.json}</code></pre>
			</details>
		</article>
	{/each}
</section>

<style lang="scss">
	.lead {
		max-width: 46rem;
	}

	.contents {
		margin: 1.5rem 0 2rem;

		ul {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem 1.25rem;
			list-style: none;
			margin: 0;
			padding: 0;
		}
	}

	section {
		margin-bottom: 2.5rem;

		> h2 {
			font-size: 1.4rem;
		}
	}

	.operation {
		margin-bottom: 1rem;

		h3 {
			font-size: 1rem;
			overflow-wrap: anywhere;
		}

		h4 {
			font-size: 0.9rem;
			color: var(--text-muted);
			margin: 1rem 0 0.5rem;
		}
	}

	code,
	pre,
	.method {
		font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.875rem;
	}

	pre {
		overflow-x: auto;
		margin: 0 0 1rem;
		padding: 0.75rem 1rem;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		color: var(--text);
	}

	.method {
		display: inline-block;
		margin-right: 0.25rem;
		padding: 0.1rem 0.45rem;
		border-radius: var(--radius-sm);
		background: var(--surface-2);
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 700;
	}

	.table {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 0.5rem;

		th,
		td {
			padding: 0.4rem 0.6rem;
			text-align: left;
			vertical-align: top;
		}

		th {
			font-size: 0.8rem;
			color: var(--text-muted);
			font-weight: 600;
		}

		td {
			overflow-wrap: anywhere;
		}

		tbody tr td {
			border-top: 1px solid var(--border);
		}
	}

	details {
		margin-top: 0.75rem;

		summary {
			cursor: pointer;
			color: var(--text-muted);
		}

		pre {
			margin-top: 0.5rem;
		}
	}
</style>
