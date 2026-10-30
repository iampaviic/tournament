import type { BracketTheme } from '../types';
import ParticipantLabel from './ParticipantLabel.svelte';

/** A dark theme for TETR.IO tournaments that shows each player's rank, TR and country. */
export const tetrioTheme: BracketTheme = {
	id: 'tetrio',
	name: 'TETR.IO',
	description:
		"Dark and bold, with each player's TETRA LEAGUE rank, TR and country from their linked TETR.IO account.",
	module: 'tetrio',
	style: {
		background: '#0c0e1d',
		card: '#171b31',
		border: '#2b3156',
		text: '#eef0ff',
		muted: '#9aa0c6',
		line: '#4a5285',
		ink: '#ffd23f',
		ready: '#1a1f3b',
		highlight: '#ffd23f',
		font: 'var(--font)'
	},
	ParticipantLabel
};
