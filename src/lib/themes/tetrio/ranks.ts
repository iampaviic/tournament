/** Badge colors for TETRA LEAGUE ranks, keyed by the rank as `bracketFields` formats it. */
const RANK_COLORS: Record<string, string> = {
	'X+': '#a95cff',
	X: '#c35ce0',
	U: '#ff4545',
	SS: '#f59f2a',
	'S+': '#e0b630',
	S: '#d6a72a',
	'S-': '#c99a28',
	'A+': '#3dbf68',
	A: '#33a857',
	'A-': '#2c9550',
	'B+': '#4f84e6',
	B: '#4573cc',
	'B-': '#3e66b5',
	'C+': '#7c4fd6',
	C: '#6c44bf',
	'C-': '#5e3aa8',
	'D+': '#8f6b8f',
	D: '#7a5c7a'
};

export const rankColor = (rank: string) => RANK_COLORS[rank] ?? '#4b5068';

/** The flag emoji for a two-letter country code, or `null` for anything else. */
export function flag(country: string | undefined): string | null {
	if (!country || !/^[A-Z]{2}$/i.test(country)) return null;
	return String.fromCodePoint(
		...[...country.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65)
	);
}
