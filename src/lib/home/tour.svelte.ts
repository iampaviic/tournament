/**
 * A section that steps through its states on its own, the way a game's attract screen does, so a
 * visitor sees every state without having to click. It only runs while the section is on screen,
 * never under reduced motion, holds while the visitor is using its controls (pointer over them or
 * focus inside them), and stops for good when they press pause. Picking a step by hand starts the
 * wait for the next one over.
 */
export class Tour {
	step = $state(0);
	paused = $state(false);
	#held = $state(false);
	#visible = $state(false);
	#reduced = $state(true);

	constructor(
		readonly count: number,
		/** How long each step is shown, in milliseconds. */
		readonly interval = 3800
	) {
		$effect(() => {
			const current = this.step;
			if (!this.running) return;
			const timer = setTimeout(() => (this.step = (current + 1) % this.count), this.interval);
			return () => clearTimeout(timer);
		});
	}

	/** Whether the tour can run at all here: false under reduced motion, so no controls show. */
	get available() {
		return !this.#reduced;
	}

	get running() {
		return !this.paused && !this.#held && this.#visible && !this.#reduced;
	}

	/** Watches the whole section: the tour runs while enough of it is on screen. */
	section = (node: HTMLElement) => {
		const observer = new IntersectionObserver(([entry]) => (this.#visible = entry.isIntersecting), {
			threshold: 0.35
		});
		observer.observe(node);
		const motion = matchMedia('(prefers-reduced-motion: reduce)');
		const update = () => (this.#reduced = motion.matches);
		update();
		motion.addEventListener('change', update);
		return () => {
			observer.disconnect();
			motion.removeEventListener('change', update);
		};
	};

	/** Watches the section's controls: the tour holds while the visitor is using them. */
	controls = (node: HTMLElement) => {
		const check = () =>
			(this.#held = node.matches(':hover') || node.contains(document.activeElement));
		const events = ['pointerenter', 'pointerleave', 'focusin', 'focusout'] as const;
		// Focus moves after focusout fires, so look once it has landed.
		const later = () => setTimeout(check);
		for (const type of events) node.addEventListener(type, later);
		return () => {
			for (const type of events) node.removeEventListener(type, later);
		};
	};
}
