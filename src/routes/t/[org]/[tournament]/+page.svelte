<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import BracketView from '#lib/components/bracket/BracketView.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import MatchLines from '#lib/components/MatchLines.svelte';
	import {
		formatLabel,
		groupName,
		matchStatusLabel,
		progressTone,
		stageLabel
	} from '#lib/labels.ts';
	import { themeById } from '#lib/themes/index.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const status = $derived(data.tournament.status);
	const here = $derived(page.url.pathname);
	const unmet = $derived(data.requirements.some((r) => r.status !== 'ok'));
	const ranked = $derived(data.participants.some((p) => p.finalRank !== null));
	const participants = $derived(
		ranked
			? data.participants.toSorted((a, b) => (a.finalRank ?? Infinity) - (b.finalRank ?? Infinity))
			: data.participants
	);
	const linkHref = (moduleId: string) =>
		`/auth/${moduleId}/login?intent=link&next=${encodeURIComponent(here)}`;
	const side = (entrant: string | null | undefined) =>
		entrant
			? { name: entrant }
			: { name: entrant === null ? m.match_bye() : m.match_tbd(), placeholder: true };
	const params = $derived({ org: data.org.slug, tournament: data.tournament.slug });

	// The stage being played, or the last one once the tournament is over.
	const stage = $derived(
		data.sheet &&
			(data.sheet.stages.find((s) => s.status === 'running') ??
				data.sheet.stages.findLast((s) => s.status !== 'pending'))
	);
	const theme = $derived(data.sheet && themeById(data.sheet.themeId));
</script>

{#if data.next}
	{@const next = data.next}
	<section class="card next" aria-labelledby="next-match">
		<header>
			<h2 id="next-match">{m.t_next_match()}</h2>
			<span class="muted">
				{m.t_match_number({ number: next.number })}{#if next.stageCount > 1}
					· {stageLabel(next.stageIndex, next.stageCount)}{/if}
			</span>
		</header>
		<div class="next-body">
			<MatchLines
				size="lg"
				sides={[side(next.entrants[0]), side(next.entrants[1])]}
				me={next.side}
			/>
			<div class="next-action">
				<span class="badge {progressTone(next.progress)}">{matchStatusLabel(next.progress)}</span>
				<a
					class="btn primary"
					href={resolve('/t/[org]/[tournament]/matches/[id]', { ...params, id: next.id })}
				>
					{m.t_open_room()}
				</a>
			</div>
		</div>
	</section>
{/if}

{#if data.sheet && stage && theme}
	{@const sheet = data.sheet}
	<section class="sheet" aria-labelledby="sheet-title">
		<header>
			<h2 id="sheet-title">
				{stageLabel(stage.index, sheet.stages.length)}
				<span class="muted format">{formatLabel(stage.type)}</span>
			</h2>
			<a href={resolve('/t/[org]/[tournament]/bracket', params)}>{m.t_full_bracket()}</a>
		</header>
		{#each stage.groups as group, groupIndex (groupIndex)}
			{#if group.matches.length}
				{#if stage.groups.length > 1}<h3>{groupName(groupIndex)}</h3>{/if}
				<BracketView
					matches={group.matches}
					participants={sheet.participants}
					{theme}
					type={stage.type}
					me={sheet.me}
					disputed={sheet.disputed}
					label={m.bracket_label({
						name:
							stage.groups.length > 1
								? `${stageLabel(stage.index, sheet.stages.length)}, ${groupName(groupIndex)}`
								: stageLabel(stage.index, sheet.stages.length)
					})}
				/>
			{/if}
		{/each}
	</section>
{/if}

<!-- The rest of the sheet's margin: ruled text, not boxes. -->
<div class="layout">
	{#if data.description}
		<section class="description" aria-labelledby="about">
			<h2 id="about">{m.t_about()}</h2>
			<p>{data.description}</p>
		</section>
	{/if}

	<aside class="registration" aria-labelledby="registration">
		<h2 id="registration">{m.t_registration()}</h2>
		{#if data.limit !== null && (status === 'registration' || status === 'check_in')}
			<div class="capacity">
				<div
					class="track"
					role="meter"
					aria-valuemin={0}
					aria-valuemax={data.limit}
					aria-valuenow={data.participants.length}
					aria-label={m.t_capacity({ count: data.participants.length, limit: data.limit })}
				>
					<span style:width="{Math.min(100, (data.participants.length / data.limit) * 100)}%"
					></span>
				</div>
				<span class="muted num">
					{m.t_capacity({ count: data.participants.length, limit: data.limit })}
				</span>
			</div>
		{/if}
		{#if form?.error}<p class="alert error" role="alert">{form.error}</p>{/if}

		{#if data.me}
			{#if data.me.finalRank}
				<p><strong>{m.t_your_rank({ rank: data.me.finalRank })}</strong></p>
			{:else if status === 'running'}
				<p>{m.t_playing()}</p>
			{:else if status === 'check_in' && !data.me.checkedIn}
				<p>{m.t_check_in_prompt()}</p>
				<form method="POST" action="?/checkIn" use:enhance>
					<button class="btn primary" type="submit">{m.t_check_in()}</button>
				</form>
			{:else}
				<p>{data.me.checkedIn ? m.t_checked_in() : m.t_registered()}</p>
			{/if}
			{#if status === 'registration' || status === 'check_in'}
				<form method="POST" action="?/leave" use:enhance>
					<button class="btn small danger" type="submit">{m.t_leave()}</button>
				</form>
			{/if}
		{:else if status === 'registration'}
			{#if data.requirements.length}
				<p>{m.t_requirements()}</p>
				<ul class="requirements">
					{#each data.requirements as requirement (requirement.moduleId)}
						<li class:ok={requirement.status === 'ok'}>
							{#if requirement.status === 'ok'}
								<Icon name="check" />
								{m.t_requirement_ok({ module: requirement.moduleName })}
							{:else if requirement.status === 'ineligible'}
								<Icon name="cross" />
								{requirement.reason}
							{:else}
								<Icon name="cross" />
								{m.t_requirement_missing({ module: requirement.moduleName })}
								{#if data.user && requirement.status === 'missing'}
									<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- server endpoint that redirects to the provider -->
									<a class="btn small" href={linkHref(requirement.moduleId)} data-sveltekit-reload>
										{m.t_link()}
									</a>
								{/if}
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			{#if !data.user}
				<a class="btn primary" href={resolve(`/login?next=${encodeURIComponent(here)}`)}>
					{m.t_sign_in_to_register()}
				</a>
			{:else if data.full}
				<p class="muted">{m.t_full()}</p>
			{:else}
				<form method="POST" action="?/register" use:enhance>
					<button class="btn primary" type="submit" disabled={unmet}>{m.t_register()}</button>
				</form>
			{/if}
		{:else if status === 'draft'}
			<p class="muted">{m.t_not_open()}</p>
		{:else}
			<p class="muted">{m.t_registration_closed()}</p>
		{/if}
	</aside>

	<section class="participants">
		<h2>{m.t_participants({ count: data.participants.length })}</h2>
		{#if participants.length}
			<ol>
				{#each participants as participant (participant.id)}
					<li>
						{#if ranked}<span class="rank">{participant.finalRank ?? '–'}</span>{/if}
						<a class="name" href={resolve('/u/[username]', { username: participant.username })}>
							{participant.displayName}
						</a>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="muted">{m.t_no_participants()}</p>
		{/if}
	</section>
</div>

<style lang="scss">
	@use 'tokens' as *;

	.next {
		margin-bottom: var(--gap);

		header {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			gap: 0.25rem 0.75rem;
			margin-bottom: 0.75rem;

			h2 {
				margin: 0;
			}
		}
	}

	.next-body {
		display: grid;
		gap: 1rem 2rem;
		align-items: end;

		@include up($bp-sm) {
			grid-template-columns: minmax(0, 28rem) auto;
			justify-content: space-between;
		}
	}

	.next-action {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.sheet {
		margin-bottom: 2.5rem;

		header {
			display: flex;
			flex-wrap: wrap;
			align-items: baseline;
			justify-content: space-between;
			gap: 0.25rem 1rem;
			margin-bottom: 0.75rem;
		}

		h2 {
			margin: 0;
		}

		h3 {
			margin: 1rem 0 0.5rem;
			font-size: 1rem;
		}

		.format {
			margin-left: 0.5rem;
			font-size: var(--fs-body);
			font-weight: 400;
		}
	}

	.layout {
		display: grid;
		gap: 2rem var(--gap);
		align-items: start;

		@include up($bp-md) {
			grid-template-columns: 2fr 1fr;

			.registration {
				grid-column: 2;
				grid-row: 1 / span 2;
			}
		}

		// Each block starts on a printed rule, like a section in the sheet's margin.
		> section,
		> aside {
			padding-top: 0.75rem;
			border-top: 1px solid var(--line);
		}

		h2 {
			margin: 0 0 0.75rem;
		}
	}

	.description p {
		margin: 0;
		max-width: 65ch;
		white-space: pre-line;
	}

	.registration {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: flex-start;

		h2,
		p {
			margin: 0;
		}
	}

	.capacity {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		align-self: stretch;
	}

	.track {
		height: 8px;
		border-radius: 999px;
		background: var(--accent-track);
		overflow: hidden;

		span {
			display: block;
			height: 100%;
			border-radius: inherit;
			background: var(--accent);
		}
	}

	.requirements {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;

		li {
			color: var(--danger);
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem;

			&.ok {
				color: var(--success);
			}
		}
	}

	.participants {
		ol {
			list-style: none;
			margin: 0;
			padding: 0;
			columns: 13rem;
			column-gap: 1.5rem;
		}

		li {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			min-height: 40px;
			border-bottom: 1px solid var(--rule);
			break-inside: avoid;
		}

		a {
			color: var(--text);
			text-decoration: none;

			&:hover {
				color: var(--accent);
			}
		}

		.rank {
			width: 1.75rem;
			text-align: right;
			color: var(--text-muted);
			font-variant-numeric: tabular-nums;
		}
	}
</style>
