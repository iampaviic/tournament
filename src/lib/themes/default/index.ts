import type { BracketTheme } from '../types';
import ParticipantLabel from './ParticipantLabel.svelte';

/** Follows the app's colors, including dark mode. */
export const defaultTheme: BracketTheme = {
	id: 'default',
	name: 'Default',
	description: 'The printed draw sheet of the site, in light or dark.',
	style: {
		background: 'var(--surface)',
		card: 'var(--surface)',
		border: 'var(--control)',
		text: 'var(--text)',
		muted: 'var(--text-muted)',
		line: 'var(--line)',
		ink: 'var(--text)',
		ready: 'var(--accent-soft)',
		highlight: 'var(--accent)',
		font: 'var(--font)'
	},
	ParticipantLabel
};
