/**
 * Shows every `[data-reveal]` element inside `root` once it scrolls into view. The elements are only
 * hidden while the `js` class is on the document, so the page is complete without scripts.
 */
export function revealOnScroll(root: ParentNode = document): () => void {
	const elements = [...root.querySelectorAll<HTMLElement>('[data-reveal]')];
	if (typeof IntersectionObserver === 'undefined') {
		for (const element of elements) element.classList.add('is-in');
		return () => {};
	}
	// A field that opens from a clip has no visible area to intersect yet, so its parent is watched.
	const watched = new Map<Element, HTMLElement[]>();
	for (const element of elements) {
		const target = element.dataset.reveal === 'open' ? (element.parentElement ?? element) : element;
		watched.set(target, [...(watched.get(target) ?? []), element]);
	}
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				for (const element of watched.get(entry.target) ?? []) element.classList.add('is-in');
				observer.unobserve(entry.target);
			}
		},
		{ rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
	);
	for (const target of watched.keys()) observer.observe(target);
	return () => observer.disconnect();
}
