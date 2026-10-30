import { building } from '$app/env';
import { BRACKET_THEMES } from '$app/env/private';
import { themes, type BracketTheme } from '#lib/themes/index.ts';

/** Checks `BRACKET_THEMES` against the installed themes. The default theme is always available. */
export function resolveThemes(enabled: string[], installed: Pick<BracketTheme, 'id'>[]): string[] {
	if (enabled.length === 0) return installed.map((theme) => theme.id);
	const unknown = enabled.filter((id) => !installed.some((theme) => theme.id === id));
	if (unknown.length) {
		throw new Error(
			`BRACKET_THEMES lists themes that aren't installed: ${unknown.join(', ')}. ` +
				`Installed: ${installed.map((theme) => theme.id).join(', ')}.`
		);
	}
	return [...new Set(['default', ...enabled])];
}

const enabled = building ? [] : resolveThemes(BRACKET_THEMES, themes);

/** Ids of the themes organizers can pick, in registry order. */
export const listThemeIds = () => themes.map((t) => t.id).filter((id) => enabled.includes(id));

export const isThemeEnabled = (id: string) => enabled.includes(id);

/** The theme a tournament is shown with: the default one if its theme was turned off. */
export const tournamentTheme = (themeId: string) =>
	themes.find((theme) => theme.id === (isThemeEnabled(themeId) ? themeId : 'default'))!;
