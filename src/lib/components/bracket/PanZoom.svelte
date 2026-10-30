<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { clampView, fitView, zoomAt, type View } from '#lib/panZoom.ts';

	let {
		width,
		height,
		label,
		children
	}: { width: number; height: number; label: string; children: Snippet } = $props();

	const PADDING = 24;
	/** How much of the content always stays in view, in pixels. */
	const MARGIN = 80;
	const STEP = 1.25;

	const content = $derived({ width: width + 2 * PADDING, height: height + 2 * PADDING });

	let root = $state<HTMLDivElement>();
	let viewport = $state<HTMLDivElement>();
	let viewportWidth = $state(0);
	let viewportHeight = $state(0);
	let view = $state<View>({ x: 0, y: 0, scale: 1 });
	let canFullscreen = $state(false);
	let fullscreen = $state(false);
	/** The scale the bracket starts at; the viewport is only as tall as the content at that scale. */
	let startScale = $state<number | null>(null);

	const size = () => ({ width: viewportWidth, height: viewportHeight });
	const center = () => ({ x: viewportWidth / 2, y: viewportHeight / 2 });
	const move = (next: View) => (view = clampView(next, content, size(), MARGIN));
	const fit = () => (view = fitView(content, size(), 0));

	// Start at full size in the top left, unless shrinking a little shows everything.
	$effect(() => {
		if (startScale !== null || !viewportWidth || !viewportHeight) return;
		const fitted = fitView(content, size(), 0);
		startScale = fitted.scale >= 0.75 ? fitted.scale : 1;
		view = { x: 0, y: 0, scale: startScale };
	});

	onMount(() => {
		canFullscreen = document.fullscreenEnabled;
		const onchange = () => {
			fullscreen = document.fullscreenElement === root;
			requestAnimationFrame(fit);
		};
		document.addEventListener('fullscreenchange', onchange);
		return () => document.removeEventListener('fullscreenchange', onchange);
	});

	const local = (event: { clientX: number; clientY: number }) => {
		const rect = viewport!.getBoundingClientRect();
		return { x: event.clientX - rect.left, y: event.clientY - rect.top };
	};

	// Ctrl + scroll (and trackpad pinch, which browsers report the same way) zooms; sideways
	// scrolling pans. Plain scrolling is left to the page. Needs a non-passive listener.
	$effect(() => {
		const element = viewport!;
		const onwheel = (event: WheelEvent) => {
			if (event.ctrlKey || event.metaKey) {
				event.preventDefault();
				const delta = Math.max(-50, Math.min(50, event.deltaY));
				move(zoomAt(view, Math.exp(-delta * 0.01), local(event)));
			} else if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
				event.preventDefault();
				move({ ...view, x: view.x - event.deltaX });
			}
		};
		element.addEventListener('wheel', onwheel, { passive: false });
		return () => element.removeEventListener('wheel', onwheel);
	});

	// Pointers that are down, by id. Only event handlers read it, so it needn't be reactive.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const pointers = new Map<number, { x: number; y: number }>();
	let start = { x: 0, y: 0 };
	let dragged = false;

	function onpointerdown(event: PointerEvent) {
		if (event.button !== 0) return;
		pointers.set(event.pointerId, local(event));
		if (pointers.size === 1) {
			start = local(event);
			dragged = false;
		}
	}

	function onpointermove(event: PointerEvent) {
		const previous = pointers.get(event.pointerId);
		if (!previous) return;
		if (event.buttons === 0) {
			pointers.delete(event.pointerId);
			return;
		}
		const point = local(event);
		if (pointers.size === 1) {
			// A small movement is still a click, so links and buttons inside keep working.
			if (!dragged && Math.hypot(point.x - start.x, point.y - start.y) < 4) return;
			if (!dragged) viewport!.setPointerCapture(event.pointerId);
			dragged = true;
			move({ ...view, x: view.x + point.x - previous.x, y: view.y + point.y - previous.y });
		} else {
			const other = [...pointers].find(([id]) => id !== event.pointerId)![1];
			const before = Math.hypot(previous.x - other.x, previous.y - other.y);
			const after = Math.hypot(point.x - other.x, point.y - other.y);
			dragged = true;
			if (before > 0) {
				move(
					zoomAt(view, after / before, { x: (point.x + other.x) / 2, y: (point.y + other.y) / 2 })
				);
			}
		}
		pointers.set(event.pointerId, point);
	}

	function onpointerup(event: PointerEvent) {
		pointers.delete(event.pointerId);
	}

	function onclick(event: MouseEvent) {
		if (!dragged) return;
		event.preventDefault();
		event.stopPropagation();
		dragged = false;
	}

	function onkeydown(event: KeyboardEvent) {
		const pan = 60;
		const actions: Record<string, () => void> = {
			ArrowLeft: () => move({ ...view, x: view.x + pan }),
			ArrowRight: () => move({ ...view, x: view.x - pan }),
			ArrowUp: () => move({ ...view, y: view.y + pan }),
			ArrowDown: () => move({ ...view, y: view.y - pan }),
			'+': () => move(zoomAt(view, STEP, center())),
			'=': () => move(zoomAt(view, STEP, center())),
			'-': () => move(zoomAt(view, 1 / STEP, center())),
			'0': fit
		};
		const action = actions[event.key];
		if (action && !event.ctrlKey && !event.metaKey && !event.altKey) {
			event.preventDefault();
			action();
		}
	}

	const toggleFullscreen = () =>
		fullscreen ? document.exitFullscreen() : root?.requestFullscreen();
</script>

<div class="pan-zoom" class:fullscreen role="region" aria-label={label} bind:this={root}>
	<div class="toolbar">
		<span class="hint">{m.bracket_hint()}</span>
		<button
			type="button"
			onclick={() => move(zoomAt(view, STEP, center()))}
			aria-label={m.bracket_zoom_in()}
			title={m.bracket_zoom_in()}>+</button
		>
		<button
			type="button"
			onclick={() => move(zoomAt(view, 1 / STEP, center()))}
			aria-label={m.bracket_zoom_out()}
			title={m.bracket_zoom_out()}>−</button
		>
		<button type="button" onclick={fit} aria-label={m.bracket_fit()} title={m.bracket_fit()}
			>⤢</button
		>
		{#if canFullscreen}
			<button
				type="button"
				onclick={toggleFullscreen}
				aria-label={fullscreen ? m.bracket_exit_fullscreen() : m.bracket_fullscreen()}
				title={fullscreen ? m.bracket_exit_fullscreen() : m.bracket_fullscreen()}
				aria-pressed={fullscreen}>⛶</button
			>
		{/if}
	</div>

	<!-- Focusable so the bracket can be moved with the keyboard, like a map. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_static_element_interactions -->
	<div
		class="viewport"
		tabindex="0"
		bind:this={viewport}
		bind:clientWidth={viewportWidth}
		bind:clientHeight={viewportHeight}
		style:height={fullscreen ? undefined : `min(${content.height * (startScale ?? 1)}px, 75vh)`}
		{onpointerdown}
		{onpointermove}
		{onpointerup}
		onpointercancel={onpointerup}
		onclickcapture={onclick}
		{onkeydown}
	>
		<div
			class="content"
			data-testid="bracket-content"
			style:width="{width}px"
			style:height="{height}px"
			style:padding="{PADDING}px"
			style:transform="translate({view.x}px, {view.y}px) scale({view.scale})"
		>
			{@render children()}
		</div>
	</div>
</div>

<style lang="scss">
	.pan-zoom {
		position: relative;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bracket-background);
		overflow: hidden;

		&.fullscreen {
			display: flex;
			flex-direction: column;
			border: 0;
			border-radius: 0;

			.viewport {
				flex: 1;
			}
		}
	}

	.viewport {
		position: relative;
		overflow: hidden;
		cursor: grab;
		touch-action: none;
		user-select: none;

		&:active {
			cursor: grabbing;
		}

		&:focus-visible {
			outline: 2px solid var(--bracket-highlight);
			outline-offset: -2px;
		}
	}

	.content {
		box-sizing: content-box;
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		will-change: transform;
	}

	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.35rem 0.5rem;
		border-bottom: 1px solid var(--bracket-border);
		color: var(--bracket-muted);

		.hint {
			flex: 1;
			font-size: 0.75rem;
		}

		button {
			width: 1.9rem;
			height: 1.9rem;
			border: 1px solid var(--bracket-border);
			border-radius: var(--bracket-radius);
			background: var(--bracket-card);
			color: var(--bracket-text);
			font: inherit;
			font-size: 1rem;
			line-height: 1;
			cursor: pointer;

			&:hover,
			&:focus-visible {
				border-color: var(--bracket-highlight);
			}
		}
	}
</style>
