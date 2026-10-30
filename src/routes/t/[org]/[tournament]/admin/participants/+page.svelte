<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const status = $derived(data.tournament.status);
	const editable = $derived(status !== 'running' && status !== 'completed');
</script>

{#if form?.error}
	<p class="alert error" role="alert">{form.error}</p>
{:else if form?.message}
	<p class="alert success" role="status">{form.message}</p>
{/if}

{#if editable}
	<form method="POST" action="?/add" class="card add" use:enhance>
		<div class="row">
			<div class="field grow">
				<label for="username">{m.participants_add()}</label>
				<input
					id="username"
					name="username"
					type="text"
					required
					autocomplete="off"
					aria-describedby="username-hint"
				/>
				<span class="hint" id="username-hint">{m.participants_add_hint()}</span>
			</div>
			<button class="btn primary" type="submit">{m.participants_add_submit()}</button>
		</div>
	</form>
{/if}

<div class="card">
	{#if data.participants.length}
		{#if editable}
			<form method="POST" action="?/shuffle" class="toolbar" use:enhance>
				<button class="btn small" type="submit">{m.participants_shuffle()}</button>
			</form>
		{/if}
		<ol class="participants">
			{#each data.participants as participant, index (participant.id)}
				<li>
					<span class="seed"
						>{participant.finalRank
							? m.participants_rank({ rank: participant.finalRank })
							: index + 1}</span
					>
					<Avatar src={participant.avatarUrl} name={participant.displayName} size={32} />
					<div class="who">
						<a href={resolve('/u/[username]', { username: participant.username })}>
							{participant.displayName}
						</a>
						<span class="muted small">@{participant.username}</span>
						{#if participant.checkedInAt}
							<span class="badge success">{m.participants_checked_in()}</span>
						{/if}
						{#each participant.problems as problem (problem)}
							<div class="problem small">{problem}</div>
						{/each}
					</div>
					{#if editable}
						<div class="actions">
							{#if status === 'check_in'}
								<form method="POST" action="?/checkIn" use:enhance>
									<input type="hidden" name="participantId" value={participant.id} />
									<input
										type="hidden"
										name="checkedIn"
										value={participant.checkedInAt ? 'false' : 'true'}
									/>
									<button class="btn small" type="submit">
										{participant.checkedInAt
											? m.participants_undo_check_in()
											: m.participants_check_in()}
									</button>
								</form>
							{/if}
							<form method="POST" action="?/up" use:enhance>
								<input type="hidden" name="participantId" value={participant.id} />
								<button
									class="btn small"
									type="submit"
									disabled={index === 0}
									aria-label={m.participants_move_up()}>↑</button
								>
							</form>
							<form method="POST" action="?/down" use:enhance>
								<input type="hidden" name="participantId" value={participant.id} />
								<button
									class="btn small"
									type="submit"
									disabled={index === data.participants.length - 1}
									aria-label={m.participants_move_down()}>↓</button
								>
							</form>
							<form method="POST" action="?/remove" use:enhance>
								<input type="hidden" name="participantId" value={participant.id} />
								<button class="btn small danger" type="submit">{m.participants_remove()}</button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{:else}
		<p class="muted empty">{m.participants_empty()}</p>
	{/if}
</div>

<style lang="scss">
	.add {
		margin-bottom: 1rem;
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

	.toolbar {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.5rem;
	}

	.participants {
		list-style: none;
		margin: 0;
		padding: 0;

		li {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem;
			padding: 0.6rem 0;

			& + li {
				border-top: 1px solid var(--rule);
			}
		}
	}

	.seed {
		width: 2.5rem;
		text-align: right;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.who {
		flex: 1;
		min-width: 10rem;

		a {
			font-weight: 600;
			color: var(--text);
			text-decoration: none;
		}
	}

	.problem {
		color: var(--danger);
	}

	.small {
		font-size: var(--fs-small);
	}

	.actions {
		display: flex;
		gap: 0.35rem;
	}

	.empty {
		margin: 0;
	}
</style>
