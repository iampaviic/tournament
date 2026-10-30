<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import { statusLabel } from '#lib/labels.ts';
	import { slugify } from '#lib/slug.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let name = $derived(form?.values.name ?? '');
	let customSlug = $derived(form?.values.slug ?? '');
	const slug = $derived(customSlug || slugify(name));
	const errors: Partial<Record<string, string[]>> = $derived(form?.errors ?? {});
</script>

<div class="card">
	{#if data.tournaments.length}
		<ul class="list">
			{#each data.tournaments as tournament (tournament.id)}
				<li>
					<div>
						<a
							href={resolve('/t/[org]/[tournament]/admin', {
								org: data.org.slug,
								tournament: tournament.slug
							})}
						>
							{tournament.name}
						</a>
						<div class="muted small">
							{#if tournament.startsAt}{formatDate(tournament.startsAt)} ·{/if}
							{m.tournaments_participants({ count: tournament.participants })}
						</div>
					</div>
					<span class="badge">{statusLabel(tournament.status)}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted empty">{m.tournaments_empty()}</p>
	{/if}
</div>

<form method="POST" class="card create" use:enhance>
	<h2>{m.tournaments_new_title()}</h2>
	<div class="row">
		<div class="field grow">
			<label for="t-name">{m.tournament_name()}</label>
			<input
				id="t-name"
				name="name"
				type="text"
				bind:value={name}
				required
				maxlength="80"
				aria-describedby="t-name-error"
				aria-invalid={errors.name ? 'true' : undefined}
			/>
			{#if errors.name}<span class="error" id="t-name-error">{errors.name.join(' ')}</span>{/if}
		</div>
		<div class="field grow">
			<label for="t-slug">{m.tournament_slug()}</label>
			<input
				id="t-slug"
				name="slug"
				type="text"
				value={slug}
				oninput={(event) => (customSlug = event.currentTarget.value)}
				required
				maxlength="40"
				aria-describedby="t-slug-error"
				aria-invalid={errors.slug ? 'true' : undefined}
			/>
			{#if errors.slug}<span class="error" id="t-slug-error">{errors.slug.join(' ')}</span>{/if}
		</div>
		<button class="btn primary" type="submit">{m.tournaments_create()}</button>
	</div>
</form>

<style lang="scss">
	.list {
		list-style: none;
		margin: 0;
		padding: 0;

		li {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 1rem;
			padding: 0.6rem 0;

			& + li {
				border-top: 1px solid var(--border);
			}
		}

		a {
			font-weight: 600;
			text-decoration: none;
		}
	}

	.small {
		font-size: 0.85rem;
	}

	.empty {
		margin: 0;
	}

	.create {
		margin-top: 1.5rem;

		h2 {
			font-size: 1.1rem;
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
