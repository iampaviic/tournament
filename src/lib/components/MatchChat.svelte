<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import { formatTime } from '#lib/format.ts';
	import type { ChatMessage } from '#lib/server/services/chat.ts';

	let { messages, canPost }: { messages: ChatMessage[]; canPost: boolean } = $props();

	let log = $state<HTMLOListElement>();

	// Keep the newest message in view.
	$effect(() => {
		if (log && messages.length) log.scrollTop = log.scrollHeight;
	});
</script>

<section class="card chat">
	<h3>{m.chat_title()}</h3>
	<ol role="log" aria-label={m.chat_log()} bind:this={log}>
		{#each messages as message (message.id)}
			<li>
				<p class="meta">
					<strong class="name" class:pen={message.asOrganizer}
						>{message.author?.displayName ?? message.apiKey}</strong
					>
					{#if message.asOrganizer}<span class="badge danger">{m.chat_organizer()}</span>{/if}
					{#if message.apiKey}<span class="badge">{m.chat_api_key()}</span>{/if}
					<time class="muted" datetime={message.createdAt.toISOString()}
						>{formatTime(message.createdAt)}</time
					>
				</p>
				<p class="body">{message.body}</p>
			</li>
		{:else}
			<li class="muted">{m.chat_empty()}</li>
		{/each}
	</ol>
	{#if canPost}
		<form method="POST" action="?/message" use:enhance>
			<textarea
				name="body"
				rows="2"
				maxlength="1000"
				required
				aria-label={m.chat_message()}
				placeholder={m.chat_message()}></textarea>
			<button class="btn primary" type="submit">{m.chat_send()}</button>
		</form>
	{:else}
		<p class="muted">{m.chat_read_only()}</p>
	{/if}
</section>

<style lang="scss">
	.chat {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;

		h3 {
			margin: 0;
		}

		> p {
			margin: 0;
		}
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 24rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		margin: 0;

		time {
			font-size: var(--fs-small);
		}

		// An organizer writes in the red pen.
		.pen {
			color: var(--danger);
		}
	}

	.body {
		margin: 0.15rem 0 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	form {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;

		textarea {
			resize: vertical;
		}
	}
</style>
