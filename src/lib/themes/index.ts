import { defaultTheme } from './default';
import { tetrioTheme } from './tetrio';
import type { BracketTheme, ThemeStyle } from './types';

export type { BracketTheme, ParticipantLabelProps, ThemeParticipant, ThemeStyle } from './types';

/** Every bracket theme installed in this build. Add new themes here. */
export const themes: BracketTheme[] = [defaultTheme, tetrioTheme];

export const themeById = (id: string) => themes.find((theme) => theme.id === id) ?? defaultTheme;

/** The theme's style as CSS custom properties (`--bracket-background` etc.) for a `style` attribute. */
export function themeStyle(style: ThemeStyle): string {
	return Object.entries(style)
		.map(
			([key, value]) => `--bracket-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value}`
		)
		.join('; ');
}
