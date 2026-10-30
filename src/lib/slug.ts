/** Turns a name like "FER Tetris Club!" into a URL slug like "fer-tetris-club". */
export function slugify(input: string, maxLength = 40): string {
	return (
		input
			.normalize('NFKD')
			.replace(/\p{Diacritic}/gu, '')
			.toLowerCase()
			// đ has no decomposition, so NFKD leaves it alone.
			.replace(/đ/g, 'd')
			.replace(/[^a-z0-9]+/g, '-')
			.slice(0, maxLength)
			.replace(/^-+|-+$/g, '')
	);
}
