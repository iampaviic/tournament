import { describe, expect, it } from 'vitest';
import { resolveThemes } from './themes';

const installed = [{ id: 'default' }, { id: 'tetrio' }, { id: 'neon' }];

describe('resolveThemes', () => {
	it('enables every installed theme by default', () => {
		expect(resolveThemes([], installed)).toEqual(['default', 'tetrio', 'neon']);
	});

	it('always keeps the default theme', () => {
		expect(resolveThemes(['tetrio'], installed)).toEqual(['default', 'tetrio']);
	});

	it('rejects themes that are not installed', () => {
		expect(() => resolveThemes(['tetrio', 'retro'], installed)).toThrow(/retro/);
	});
});
