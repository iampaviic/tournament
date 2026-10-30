import { describe, expect, it } from 'vitest';
import { clampView, fitView, MAX_SCALE, MIN_SCALE, zoomAt } from './panZoom';

describe('zoomAt', () => {
	it('keeps the point under the cursor in place', () => {
		const view = { x: 10, y: 20, scale: 1 };
		const point = { x: 110, y: 70 };
		const zoomed = zoomAt(view, 2, point);
		expect(zoomed.scale).toBe(2);
		// Content point (100, 50) was under the cursor and still is.
		expect(100 * zoomed.scale + zoomed.x).toBe(point.x);
		expect(50 * zoomed.scale + zoomed.y).toBe(point.y);
	});

	it('stays within the scale limits', () => {
		expect(zoomAt({ x: 0, y: 0, scale: 1 }, 100, { x: 0, y: 0 }).scale).toBe(MAX_SCALE);
		expect(zoomAt({ x: 0, y: 0, scale: 1 }, 0.01, { x: 0, y: 0 }).scale).toBe(MIN_SCALE);
	});
});

describe('fitView', () => {
	it('shrinks large content to fit and centers it', () => {
		expect(fitView({ width: 2000, height: 500 }, { width: 1000, height: 500 }, 0)).toEqual({
			scale: 0.5,
			x: 0,
			y: 125
		});
	});

	it('never enlarges small content', () => {
		expect(fitView({ width: 200, height: 100 }, { width: 1000, height: 500 }, 20)).toEqual({
			scale: 1,
			x: 400,
			y: 200
		});
	});
});

describe('clampView', () => {
	const content = { width: 1000, height: 400 };
	const viewport = { width: 500, height: 300 };

	it('leaves views that show the content alone', () => {
		const view = { x: -200, y: -50, scale: 1 };
		expect(clampView(view, content, viewport, 50)).toEqual(view);
	});

	it('pulls content dragged out of view back in', () => {
		expect(clampView({ x: -5000, y: 5000, scale: 1 }, content, viewport, 50)).toEqual({
			x: -950,
			y: 250,
			scale: 1
		});
	});
});
