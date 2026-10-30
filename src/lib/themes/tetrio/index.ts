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
		muted: '#8d93bb',
		line: '#3b4270',
		accent: '#ffd23f',
		accentText: '#1b1500',
		highlight: '#ffd23f',
		radius: '4px',
		font: "'Inter', system-ui, sans-serif"
	},
	ParticipantLabel
};
