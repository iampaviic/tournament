import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Checks the design tokens against WCAG AA (4.5:1 for normal text) in both color modes. */

const tokens = readFileSync(join(process.cwd(), 'src/lib/styles/_tokens.scss'), 'utf8');

/** The `--name: #rrggbb;` colors of one `@mixin tokens-<mode>` block. */
function colors(mode: 'light' | 'dark') {
	const body = tokens.match(new RegExp(`@mixin tokens-${mode} \\{([^}]*)\\}`))?.[1] ?? '';
	return Object.fromEntries(
		[...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((match) => [match[1], match[2]])
	);
}

/** WCAG relative luminance of `#rrggbb`. */
function luminance(hex: string) {
	const [r, g, b] = [1, 3, 5].map((start) => {
		const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

/** Text colors and the backgrounds they're shown on. */
const pairs: [string, string][] = [
	...['text', 'text-muted', 'accent'].flatMap((text) =>
		['bg', 'surface', 'surface-2'].map((background): [string, string] => [text, background])
	),
	...['danger', 'success'].flatMap((text) =>
		['surface', 'surface-2'].map((background): [string, string] => [text, background])
	),
	['warning-text', 'warning-bg'],
	['accent-text', 'accent'],
	['accent-text', 'accent-hover']
];

describe('design tokens', () => {
	const rows = (['light', 'dark'] as const).flatMap((mode) =>
		pairs.map(([text, background]): [typeof mode, string, string] => [mode, text, background])
	);

	it.each(rows)('%s: --%s on --%s is at least 4.5:1', (mode, text, background) => {
		const palette = colors(mode);
		expect(palette[text], `--${text}`).toBeDefined();
		expect(palette[background], `--${background}`).toBeDefined();
		expect(contrast(palette[text], palette[background])).toBeGreaterThanOrEqual(4.5);
	});
});
