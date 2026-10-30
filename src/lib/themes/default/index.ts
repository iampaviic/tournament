import type { BracketTheme } from '../types';
import ParticipantLabel from './ParticipantLabel.svelte';

/** Follows the app's colors, including dark mode. */
export const defaultTheme: BracketTheme = {
	id: 'default',
	name: 'Default',
	description: 'Clean cards in the colors of the site, light or dark.',
	style: {
		background: 'var(--bg)',
		card: 'var(--surface)',
		border: 'var(--border)',
		text: 'var(--text)',
		muted: 'var(--text-muted)',
		line: 'color-mix(in srgb, var(--text-muted) 45%, transparent)',
		accent: 'var(--accent)',
		accentText: 'var(--accent-text)',
		highlight: 'var(--accent)',
		radius: 'var(--radius-sm)',
		font: 'var(--font)'
	},
	ParticipantLabel
};
