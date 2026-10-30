import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Guards the rule that every UI string is a Paraglide message (see README, Translations). */

const src = join(process.cwd(), 'src');

/** Source files under `src`, without Paraglide's generated output and the tests. */
function sourceFiles(...extensions: string[]) {
	return readdirSync(src, { recursive: true })
		.map((file) => String(file).replaceAll('\\', '/'))
		.filter(
			(file) =>
				!file.startsWith('lib/paraglide/') &&
				!/\.spec\.ts$/.test(file) &&
				extensions.some((extension) => file.endsWith(extension))
		)
		.map((file) => ({ file: `src/${file}`, text: readFileSync(join(src, file), 'utf8') }));
}

/** Removes `{…}` blocks, nested ones included, leaving a space so text on both sides stays apart. */
function stripExpressions(markup: string) {
	let result = '';
	let depth = 0;
	for (const char of markup) {
		if (char === '{') depth++;
		else if (char === '}' && depth > 0) {
			depth--;
			if (depth === 0) result += ' ';
		} else if (depth === 0) result += char;
	}
	return result;
}

/** A component's markup without scripts, styles, comments and expressions. */
const markupOf = (component: string) =>
	stripExpressions(
		component
			.replace(/<script[\s\S]*?<\/script>/g, ' ')
			.replace(/<style[\s\S]*?<\/style>/g, ' ')
			.replace(/<!--[\s\S]*?-->/g, ' ')
	);

/** Text left in the markup. `<code>` holds code (e.g. the API key format), which isn't translated. */
const textOf = (markup: string) =>
	markup
		.replace(/<code[\s\S]*?<\/code>/g, ' ')
		.replace(/<[^>]*>/g, ' ')
		.replace(/&#?\w+;/g, ' ');

describe('messages/en.json', () => {
	it('has no unused messages', () => {
		const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages/en.json'), 'utf8'));
		const used = new Set(
			sourceFiles('.ts', '.svelte').flatMap(({ text }) =>
				[...text.matchAll(/\bm\.(\w+)/g)].map((match) => match[1])
			)
		);
		const unused = Object.keys(messages).filter((key) => key !== '$schema' && !used.has(key));
		expect(unused).toEqual([]);
	});
});

describe('components', () => {
	const components = sourceFiles('.svelte');

	it('have no hardcoded text', () => {
		const found = components.flatMap(({ file, text }) => {
			const words = textOf(markupOf(text)).match(/\p{L}{2,}/gu);
			return words ? [`${file}: ${words.join(' ')}`] : [];
		});
		expect(found).toEqual([]);
	});

	it('have no hardcoded labels, titles, placeholders or alt texts', () => {
		const found = components.flatMap(({ file, text }) =>
			[...markupOf(text).matchAll(/\b(aria-label|title|placeholder|alt)="([^"]*)"/g)]
				.filter((match) => /\p{L}/u.test(match[2]))
				.map((match) => `${file}: ${match[0]}`)
		);
		expect(found).toEqual([]);
	});
});
