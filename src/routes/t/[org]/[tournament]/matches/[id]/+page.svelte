<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import MatchChat from '#lib/components/MatchChat.svelte';
	import MatchLines from '#lib/components/MatchLines.svelte';
	import ScoreForm from '#lib/components/ScoreForm.svelte';
	import { formatScore } from '#lib/format.ts';
	import { matchContext, matchStatusLabel, progressTone } from '#lib/labels.ts';
	import { listen } from '#lib/live.ts';
	import type { ChatMessage } from '#lib/server/services/chat.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const match = $derived(data.match);
	const context = $derived(matchContext(match));
	const name = (slot: 0 | 1) => {
		const entrant = match.entrants[slot];
		return entrant === undefined
			? m.match_tbd()
			: entrant === null
				? m.match_bye()
				: (data.players[entrant]?.name ?? '?');
	};
	const names = $derived([name(0), name(1)] as [string, string]);
	const own = $derived(match.reports.find((report) => report.side === data.side));
	const opponent = $derived(
		data.side === null ? undefined : match.reports.find((report) => report.side !== data.side)
	);
	let different = $state(false);
	/** Spectators of a ready match nobody reported yet have nothing to see here. */
	const showResult = $derived(
		match.status === 'waiting' ||
			match.status === 'completed' ||
			match.reports.length > 0 ||
			data.canReport ||
			data.canHelp ||
			(data.side !== null && match.helpRequested)
	);

	let messages = $derived(data.messages);
	let connected = $state(false);
	// A string, so reloading the page data doesn't reconnect.
	const events = $derived(`${page.url.pathname}/events`);
	$effect(() =>
		listen(
			events,
			{
				chat: (received) => {
					// Sent as JSON, so the date is a string.
					const message = received as ChatMessage;
					if (messages.some((existing) => existing.id === message.id)) return;
					messages = [...messages, { ...message, createdAt: new Date(message.createdAt) }];
				},
				update: () => invalidateAll()
			},
			(on) => (connected = on)
		)
	);
</script>

{#snippet reported()}
	{#each match.reports as report (report.side)}
		<p>{m.room_reported({ name: names[report.side], score: formatScore(report.scores) })}</p>
	{/each}
{/snippet}

<p class="back">
	<a
		href={resolve('/t/[org]/[tournament]/matches', {
			org: data.org.slug,
			tournament: data.tournament.slug
		})}>{m.room_back()}</a
	>
</p>

<div class="header">
	<div>
		<h2>{m.match_number({ number: match.number })}</h2>
		{#if context}<p class="muted">{context}</p>{/if}
	</div>
	<div class="status">
		<span class="badge {progressTone(match.progress)}" data-testid="match-status"
			>{matchStatusLabel(match.progress)}</span
		>
		{#if match.helpRequested}<span class="badge danger">{m.match_help()}</span>{/if}
		<span class="live" class:on={connected} data-testid="live"
			>{connected ? m.live_on() : m.live_off()}</span
		>
	</div>
</div>

{#if form?.error}
	<p class="alert error" role="alert">{form.error}</p>
{:else if form?.message}
	<p class="alert success" role="status">{form.message}</p>
{/if}

<div class="layout">
	<div class="main">
		<section class="card scoreboard" aria-label={m.room_result()}>
			<MatchLines
				size="lg"
				sides={[
					{ name: names[0], placeholder: !match.entrants[0], score: match.result?.scores?.[0] },
					{ name: names[1], placeholder: !match.entrants[1], score: match.result?.scores?.[1] }
				]}
				winner={match.status === 'completed' ? (match.result?.winner ?? null) : null}
				me={data.side === 0 || data.side === 1 ? data.side : null}
			/>
		</section>

		{#if showResult}
			<section class="card result">
				<h3>{m.room_result()}</h3>
				{#if match.status === 'waiting'}
					<p class="muted">{m.room_waiting()}</p>
				{:else if match.status === 'completed'}
					<p>
						{match.decidedBy === 'api_key'
							? m.room_by_api_key()
							: match.decidedBy
								? m.room_by_organizer()
								: m.room_by_players()}
					</p>
				{:else if match.progress === 'disputed'}
					<p class="alert warning">{m.room_disputed()}</p>
					{@render reported()}
				{:else if data.canReport && own}
					<p>
						{m.room_you_reported({
							score: formatScore(own.scores),
							name: names[own.side === 0 ? 1 : 0]
						})}
					</p>
					<ScoreForm
						action="?/report"
						{names}
						scores={own.scores}
						submit={m.room_update_report()}
					/>
				{:else if data.canReport && opponent}
					<p>
						{m.room_reported({ name: names[opponent.side], score: formatScore(opponent.scores) })}
					</p>
					<div class="actions">
						<form method="POST" action="?/report" use:enhance>
							<input type="hidden" name="score1" value={opponent.scores[0]} />
							<input type="hidden" name="score2" value={opponent.scores[1]} />
							<button class="btn primary" type="submit">{m.room_confirm()}</button>
						</form>
						<button
							class="btn"
							type="button"
							aria-expanded={different}
							onclick={() => (different = !different)}>{m.room_report_different()}</button
						>
					</div>
					{#if different}
						<ScoreForm action="?/report" {names} submit={m.room_report()} />
					{/if}
				{:else if data.canReport}
					<ScoreForm action="?/report" {names} submit={m.room_report()} />
				{:else}
					{@render reported()}
				{/if}

				{#if data.canHelp}
					<form method="POST" action="?/help" use:enhance>
						<button class="btn small" type="submit">{m.room_help()}</button>
					</form>
				{:else if data.side !== null && match.helpRequested}
					<p class="muted">{m.room_help_requested()}</p>
				{/if}
			</section>
		{/if}

		{#if data.canSet || (data.organizer && match.helpRequested)}
			<section class="card tools">
				<h3>{m.room_organizer_tools()}</h3>
				{#if data.canSet}
					<div class="actions">
						<ScoreForm
							action="?/override"
							{names}
							scores={match.result?.scores}
							submit={m.room_set_result()}
						/>
						{#if match.result}
							<form method="POST" action="?/clear" use:enhance>
								<button class="btn small" type="submit">{m.matches_clear()}</button>
							</form>
						{/if}
					</div>
				{/if}
				{#if data.organizer && match.helpRequested}
					<form method="POST" action="?/clearHelp" use:enhance>
						<button class="btn small" type="submit">{m.room_help_clear()}</button>
					</form>
				{/if}
			</section>
		{/if}
	</div>

	<MatchChat {messages} canPost={data.canPost} />
</div>

<style lang="scss">
	@use 'tokens' as *;

	.back {
		margin: 0 0 1rem;
	}

	.header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem 1rem;
		margin-bottom: 1rem;

		h2 {
			font-size: 1.5rem;
			margin: 0;
		}

		p {
			margin: 0.25rem 0 0;
		}
	}

	.status {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}

	.live {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: var(--fs-small);
		color: var(--text-muted);

		&::before {
			content: '';
			width: 0.5rem;
			height: 0.5rem;
			border-radius: 50%;
			background: var(--control);
		}

		&.on::before {
			background: var(--success);
		}
	}

	.layout {
		display: grid;
		gap: 1rem;
		align-items: stretch;

		@include up($bp-md) {
			grid-template-columns: 3fr 2fr;
		}
	}

	.main {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}

	.scoreboard {
		padding-block: 1rem 1.25rem;
	}

	.result,
	.tools {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;

		h3 {
			margin: 0;
		}

		p {
			margin: 0;
		}
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
</style>
