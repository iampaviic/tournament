import { m } from '#lib/paraglide/messages.js';
import type { BracketTheme } from '../types';
import ParticipantLabel from './ParticipantLabel.svelte';

/** Follows the app's colors, including dark mode. */
export const defaultTheme: BracketTheme = {
	id: 'default',
	get name() {
		return m.theme_default_name();
	},
	get description() {
		return m.theme_default_description();
	},
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
