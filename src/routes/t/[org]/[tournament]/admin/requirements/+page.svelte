<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const locked = $derived(
		data.tournament.status === 'running' || data.tournament.status === 'completed'
	);
	const configValue = (config: Record<string, unknown>, key: string) => {
		const value = config[key];
		return value === undefined || value === null ? '' : String(value);
	};
</script>

<p class="muted">{m.requirements_lead()}</p>

{#if form?.error}
	<p class="alert error" role="alert">{form.error}</p>
{:else if form?.message}
	<p class="alert success" role="status">{form.message}</p>
{/if}
{#if locked}<p class="alert">{m.tadmin_locked()}</p>{/if}

<form
	method="POST"
	use:enhance={() =>
		({ update }) =>
			update({ reset: false })}
>
	<fieldset disabled={locked}>
		{#each data.modules as module (module.id)}
			<section class="card module">
				<label class="checkbox">
					<input type="checkbox" name="require.{module.id}" checked={module.required} />
					<strong>{module.name}</strong>
					<span class="muted">— {m.requirements_required()}</span>
				</label>
				{#if module.fields.length}
					<div class="fields">
						{#each module.fields as field (field.key)}
							{@const id = `${module.id}.${field.key}`}
							{#if field.type === 'checkbox'}
								<label class="checkbox">
									<input type="checkbox" name={id} checked={module.config[field.key] === true} />
									{field.label}
									{#if field.hint}<span class="muted small">{field.hint}</span>{/if}
								</label>
							{:else}
								<div class="field">
									<label for={id}>{field.label}</label>
									{#if field.type === 'select'}
										<select {id} name={id} value={configValue(module.config, field.key)}>
											{#each field.options as option (option.value)}
												<option value={option.value}>{option.label}</option>
											{/each}
										</select>
									{:else}
										<input
											{id}
											name={id}
											type="number"
											min={field.min}
											max={field.max}
											value={configValue(module.config, field.key)}
										/>
									{/if}
									{#if field.hint}<span class="hint">{field.hint}</span>{/if}
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			</section>
		{/each}
		<button class="btn primary" type="submit">{m.requirements_save()}</button>
	</fieldset>
</form>

<style lang="scss">
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
	}

	.module {
		margin-bottom: 1rem;

		> .checkbox {
			margin: 0;
		}
	}

	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
		gap: 0 1rem;
		margin-top: 1rem;
		align-items: end;
	}

	.small {
		font-size: 0.85rem;
	}
</style>
