<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import type { Game } from '#lib/tournaments.ts';
	import SteamGame from './SteamGame.svelte';

	/**
	 * Picks a Steam game. Without JavaScript it's a search form whose results each have a pick
	 * button; with it, the field becomes a combobox (ARIA 1.2) that searches `searchUrl` as you type.
	 */
	let { query, results, searchUrl }: { query: string; results: Game[]; searchUrl: string } =
		$props();

	let enhanced = $state(false);
	onMount(() => {
		enhanced = true;
	});

	let text = $derived(query);
	let options = $state<Game[]>([]);
	let open = $state(false);
	/** The highlighted option, or -1. */
	let active = $state(-1);
	/** Whether `options` answers what was typed, so the result count can be announced. */
	let searched = $state(false);
	let picked = $state<number | null>(null);
	let pickForm = $state<HTMLFormElement>();
	let listbox = $state<HTMLUListElement>();

	let timer: ReturnType<typeof setTimeout> | undefined;
	let controller: AbortController | undefined;

	const status = $derived(
		!searched
			? ''
			: options.length
				? m.game_results({ count: options.length })
				: m.game_no_results()
	);

	// Keep the highlighted option in view.
	$effect(() => {
		if (active >= 0) listbox?.children[active]?.scrollIntoView({ block: 'nearest' });
	});

	function close() {
		open = false;
		active = -1;
	}

	async function search(q: string) {
		controller?.abort();
		controller = new AbortController();
		try {
			const response = await fetch(`${searchUrl}?${new URLSearchParams({ q })}`, {
				signal: controller.signal
			});
			if (!response.ok) return;
			options = await response.json();
			searched = true;
			active = -1;
			open = options.length > 0;
		} catch {
			// Replaced by a newer search, or offline: the search button still works.
		}
	}

	function oninput() {
		clearTimeout(timer);
		const q = text.trim();
		if (q.length < 2) {
			controller?.abort();
			options = [];
			searched = false;
			close();
			return;
		}
		timer = setTimeout(() => search(q), 200);
	}

	function onkeydown(event: KeyboardEvent) {
		const last = options.length - 1;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			if (last < 0) return;
			event.preventDefault();
			const down = event.key === 'ArrowDown';
			if (!open) {
				open = true;
				active = down ? 0 : last;
			} else if (down) active = active >= last ? 0 : active + 1;
			else active = active <= 0 ? last : active - 1;
		} else if (event.key === 'Enter') {
			// Without a highlighted option, Enter submits the search form.
			if (open && active >= 0) {
				event.preventDefault();
				pick(options[active]);
			}
		} else if (event.key === 'Escape' && open) {
			event.preventDefault();
			close();
		} else if (event.key === 'Tab') {
			close();
		}
	}

	async function pick(game: Game) {
		picked = game.appId;
		text = '';
		options = [];
		searched = false;
		close();
		await tick();
		pickForm?.requestSubmit();
	}
</script>

<div class="picker">
	<form method="GET" role="search" onsubmit={close}>
		<div class="field">
			<label for="game-search">{m.game_search()}</label>
			<div class="row">
				<div class="combo">
					<input
						id="game-search"
						name="game"
						type="text"
						autocomplete="off"
						maxlength="100"
						aria-describedby="game-search-hint"
						role={enhanced ? 'combobox' : undefined}
						aria-autocomplete={enhanced ? 'list' : undefined}
						aria-expanded={enhanced ? open : undefined}
						aria-controls={enhanced ? 'game-options' : undefined}
						aria-activedescendant={open && active >= 0
							? `game-option-${options[active].appId}`
							: undefined}
						bind:value={text}
						{oninput}
						{onkeydown}
						onblur={close}
					/>
					{#if enhanced}
						<ul
							id="game-options"
							role="listbox"
							aria-label={m.game_search()}
							hidden={!open}
							bind:this={listbox}
						>
							{#each options as game, i (game.appId)}
								<!-- Focus stays in the field; a click keeps it there and picks. -->
								<li
									id="game-option-{game.appId}"
									role="option"
									aria-label={game.name}
									aria-selected={i === active}
									tabindex="-1"
									class:active={i === active}
									onmousedown={(event) => event.preventDefault()}
									onclick={() => pick(game)}
									onkeydown={(event) => event.key === 'Enter' && pick(game)}
								>
									<SteamGame {game} width={64} />
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				<button class="btn" type="submit">{m.game_search_submit()}</button>
			</div>
			<span class="hint" id="game-search-hint">{m.game_search_hint()}</span>
		</div>
	</form>

	{#if enhanced}
		<!-- Read out as results arrive; shown only when nothing was found. -->
		<p class="muted" class:visually-hidden={options.length > 0} role="status">{status}</p>
		<form method="POST" action="?/setGame" hidden bind:this={pickForm} use:enhance>
			<input type="hidden" name="appId" value={picked ?? ''} />
		</form>
	{/if}

	{#if query}
		{#if results.length}
			<ul class="results">
				{#each results as game (game.appId)}
					<li>
						<SteamGame {game} />
						<form method="POST" action="?/setGame" use:enhance>
							<input type="hidden" name="appId" value={game.appId} />
							<button class="btn small" type="submit" aria-label={m.game_pick({ name: game.name })}
								>{m.game_pick_short()}</button
							>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">{m.game_no_results()}</p>
		{/if}
	{/if}
</div>

<style lang="scss">
	.field {
		margin-bottom: 0;
	}

	.row {
		display: flex;
		gap: 0.5rem;
	}

	.combo {
		position: relative;
		flex: 1;
	}

	[role='listbox'] {
		position: absolute;
		top: calc(100% + 0.25rem);
		left: 0;
		right: 0;
		z-index: 10;
		max-height: 20rem;
		overflow-y: auto;
		list-style: none;
		margin: 0;
		padding: 0.25rem;
		background: var(--surface);
		border: 1px solid var(--control);
		border-radius: var(--radius-sm);
		// The one layer that floats: it opens over whatever is below the field.
		box-shadow: var(--shadow-float);
	}

	[role='option'] {
		display: flex;
		padding: 0.35rem 0.5rem;
		border-radius: var(--radius-sm);
		cursor: pointer;

		&:hover,
		&.active {
			background: var(--surface-2);
		}

		&.active {
			outline: 2px solid var(--focus);
			outline-offset: -2px;
		}
	}

	.results {
		list-style: none;
		padding: 0;

		li {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: 1rem;
			padding: 0.5rem 0;

			& + li {
				border-top: 1px solid var(--rule);
			}
		}
	}

	.results,
	p {
		margin: 0.75rem 0 0;
	}

	p:empty {
		margin: 0;
	}
</style>
