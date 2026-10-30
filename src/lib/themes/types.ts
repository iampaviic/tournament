import type { Component } from 'svelte';

/** A participant as bracket themes see them. */
export interface ThemeParticipant {
	id: string;
	name: string;
	avatarUrl: string | null;
	/** The `bracketFields` of the theme's auth module, if the participant linked that account. */
	fields: Record<string, string>;
}

export interface ParticipantLabelProps {
	participant: ThemeParticipant;
}

/** Colors and shapes of the bracket view. Values are CSS, so app tokens like `var(--surface)` work. */
export interface ThemeStyle {
	background: string;
	card: string;
	border: string;
	text: string;
	muted: string;
	/** Lines between matches. */
	line: string;
	/** The winner's score box. */
	accent: string;
	accentText: string;
	/** Outline of matches that are ready to be played, and of a hovered participant's matches. */
	highlight: string;
	radius: string;
	font: string;
}

/**
 * A bracket theme changes how the bracket looks and what is shown for each participant. Themes are
 * installed in `themes/index.ts`; the instance can limit which ones organizers may pick with
 * `BRACKET_THEMES`.
 */
export interface BracketTheme {
	id: string;
	name: string;
	description: string;
	/** The auth module whose `bracketFields` this theme shows, e.g. `tetrio` for ranks. */
	module?: string;
	style: ThemeStyle;
	/** Renders a participant's name (and anything else) inside a match slot. */
	ParticipantLabel: Component<ParticipantLabelProps>;
}
