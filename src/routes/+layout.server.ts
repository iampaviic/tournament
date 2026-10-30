import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	const { user } = locals;
	return {
		user: user && {
			username: user.username,
			displayName: user.displayName,
			avatarUrl: user.avatarUrl
		},
		trusted: locals.trusted
	};
};
