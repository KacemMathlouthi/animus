/** Current user (mock). Swap for the authenticated user later. */

export type User = {
	name: string;
	email: string;
	avatar: string;
};

export const currentUser: User = {
	name: "Kacem Mathlouthi",
	email: "kacem@tryanimus.com",
	avatar: "https://avatars.githubusercontent.com/u/84121071",
};
