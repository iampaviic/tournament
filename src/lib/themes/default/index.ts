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
		background: 'var(--bg)',
		card: 'var(--surface)',
		border: 'var(--border)',
		text: 'var(--text)',
		muted: 'var(--text-muted)',
		line: 'var(--control)',
		ink: 'var(--text-muted)',
		ready: 'var(--accent-soft)',
		highlight: 'var(--accent-ink)',
		p1: 'var(--p1)',
		p2: 'var(--p2)',
		onSide: 'var(--on-side)',
		font: 'var(--font)'
	},
	ParticipantLabel
};
