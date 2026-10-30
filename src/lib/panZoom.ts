/** Pan and zoom state of a viewport: content point (0, 0) is drawn at (x, y), scaled by `scale`. */
export interface View {
	x: number;
	y: number;
	scale: number;
}

export interface Size {
	width: number;
	height: number;
}

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 2;

export const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

/** Zooms by `factor`, keeping the content under `point` (in viewport coordinates) in place. */
export function zoomAt(view: View, factor: number, point: { x: number; y: number }): View {
	const scale = clampScale(view.scale * factor);
	const ratio = scale / view.scale;
	return {
		scale,
		x: point.x - (point.x - view.x) * ratio,
		y: point.y - (point.y - view.y) * ratio
	};
}

/** Shows all of the content, centered, never enlarged past its natural size. */
export function fitView(content: Size, viewport: Size, padding: number): View {
	const scale = clampScale(
		Math.min(
			1,
			(viewport.width - 2 * padding) / content.width,
			(viewport.height - 2 * padding) / content.height
		)
	);
	return {
		scale,
		x: (viewport.width - content.width * scale) / 2,
		y: (viewport.height - content.height * scale) / 2
	};
}

/** Keeps at least `margin` pixels of the content inside the viewport, so it can't be lost. */
export function clampView(view: View, content: Size, viewport: Size, margin: number): View {
	const clamp = (value: number, length: number, room: number) => {
		const keep = Math.min(margin, length);
		return Math.min(room - keep, Math.max(keep - length, value));
	};
	return {
		scale: view.scale,
		x: clamp(view.x, content.width * view.scale, viewport.width),
		y: clamp(view.y, content.height * view.scale, viewport.height)
	};
}
