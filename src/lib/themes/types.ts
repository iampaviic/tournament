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

/**
 * Colors of the bracket view, which is drawn like a printed draw sheet: names sit on printed
 * lines, and a decided match's winner line carries on into the next round. Values are CSS, so app
 * tokens like `var(--surface)` work.
 */
export interface ThemeStyle {
	/** The sheet the bracket is printed on. */
	background: string;
	/** Controls on the sheet, such as the zoom buttons. */
	card: string;
	border: string;
	text: string;
	muted: string;
	/** Printed lines: the line each name is written on, and the joints between rounds. */
	line: string;
	/** A decided match's winner line and the connector it continues into. */
	ink: string;
	/** Behind a match that is ready to be played. */
	ready: string;
	/** A hovered participant's path through the bracket. */
	highlight: string;
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
