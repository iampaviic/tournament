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
 * Colors of the bracket view. Each match is a plate of two slots, player one over player two; a
 * decided match's winner slot fills with its side's colour and its line carries on into the next
 * round. Values are CSS, so app tokens like `var(--surface)` work.
 */
export interface ThemeStyle {
	/** The sheet the bracket is printed on. */
	background: string;
	/** Controls on the sheet, such as the zoom buttons. */
	card: string;
	border: string;
	text: string;
	muted: string;
	/** Connectors between rounds that no result has reached yet. */
	line: string;
	/** The connector a decided match's winner continues along. */
	ink: string;
	/** Behind a match that is ready to be played. */
	ready: string;
	/** A hovered participant's path through the bracket. */
	highlight: string;
	/** The fill of a winning slot on player one's and player two's side; both default to `ink`. */
	p1?: string;
	p2?: string;
	/** Text on a winning slot's fill; defaults to `background`. */
	onSide?: string;
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
