<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate } from '#lib/format.ts';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const isOwner = $derived(data.role === 'owner');
	const roles = [
		{ value: 'owner', label: m.members_role_owner },
		{ value: 'admin', label: m.members_role_admin }
	] as const;
	const roleLabel = (role: string) => roles.find((r) => r.value === role)?.label() ?? role;
</script>

<p class="muted">{m.members_roles_help()}</p>

{#if form?.error}
	<p class="alert error" role="alert">{form.error}</p>
{:else if form?.message}
	<p class="alert success" role="status">{form.message}</p>
{/if}

<ul class="card members">
	{#each data.members as member (member.userId)}
		<li>
			<Avatar src={member.avatarUrl} name={member.displayName} size={36} />
			<div class="who">
				<a href={resolve('/u/[username]', { username: member.username })}>{member.displayName}</a>
				{#if member.userId === data.currentUserId}
					<span class="muted">({m.members_you()})</span>
				{/if}
				<div class="muted small">
					@{member.username} · {m.members_joined({ date: formatDate(member.joinedAt) })}
				</div>
			</div>

			{#if isOwner}
				<form method="POST" action="?/role" class="inline" use:enhance>
					<input type="hidden" name="userId" value={member.userId} />
					<select name="role" aria-label={m.members_role()} value={member.role}>
						{#each roles as role (role.value)}
							<option value={role.value}>{role.label()}</option>
						{/each}
					</select>
					<button class="btn small" type="submit">{m.members_change_role()}</button>
				</form>
				<form method="POST" action="?/remove" use:enhance>
					<input type="hidden" name="userId" value={member.userId} />
					<button class="btn small danger" type="submit">{m.members_remove()}</button>
				</form>
			{:else}
				<span class="badge">{roleLabel(member.role)}</span>
			{/if}
		</li>
	{/each}
</ul>

{#if isOwner}
	<form method="POST" action="?/add" class="card add" use:enhance>
		<h2>{m.members_add_title()}</h2>
		<div class="row">
			<div class="field grow">
				<label for="username">{m.members_username()}</label>
				<input id="username" name="username" type="text" required autocomplete="off" />
			</div>
			<div class="field">
				<label for="role">{m.members_role()}</label>
				<select id="role" name="role">
					<option value="admin">{m.members_role_admin()}</option>
					<option value="owner">{m.members_role_owner()}</option>
				</select>
			</div>
			<button class="btn primary" type="submit">{m.members_add()}</button>
		</div>
	</form>
{/if}

<style lang="scss">
	.members {
		list-style: none;
		margin: 0;
		padding: 0.5rem 1.25rem;

		li {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem;
			padding: 0.75rem 0;

			& + li {
				border-top: 1px solid var(--border);
			}
		}
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

	.small {
		font-size: 0.85rem;
	}

	.inline {
		display: flex;
		gap: 0.35rem;
	}

	.add {
		margin-top: 1.5rem;

		h2 {
			font-size: 1.1rem;
		}
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0 0.75rem;

		.btn {
			margin-bottom: 1rem;
		}
	}

	.grow {
		flex: 1;
		min-width: 12rem;
	}
</style>
