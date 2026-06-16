/** Placeholder workspace data for the app shell. Swap for real data later. */

type Conversation = {
	id: string;
	title: string;
};

type ConversationGroup = {
	label: string;
	items: Conversation[];
};

export const conversationGroups: ConversationGroup[] = [
	{
		label: "Today",
		items: [
			{
				id: "b3f1c2a4-1d6e-4a90-8c11-2f7e9a1b4c01",
				title: "How neural networks learn",
			},
			{
				id: "a91e7d52-3c84-4b1f-9e22-7d4c5a6b8e02",
				title: "The Fourier transform, visually",
			},
		],
	},
	{
		label: "Yesterday",
		items: [
			{
				id: "c47a9b13-8e2d-4f6a-b0c3-1a9e2d3f4b03",
				title: "Why the sky is blue",
			},
			{
				id: "d58b0c24-9f3e-4071-c1d4-2b0f3e4a5c04",
				title: "Bubble sort vs quicksort",
			},
		],
	},
	{
		label: "Previous 7 days",
		items: [
			{
				id: "e69c1d35-a04f-4182-d2e5-3c1a4f5b6d05",
				title: "Eigenvectors, explained",
			},
			{
				id: "f70d2e46-b15a-4293-e3f6-4d2b5a6c7e06",
				title: "How GPS triangulation works",
			},
			{
				id: "0815f3c7-c26b-43a4-f407-5e3c6b7d8f07",
				title: "The Monty Hall problem",
			},
		],
	},
];

export const currentUser = {
	name: "Kacem Mathlouthi",
	email: "kacem@tryanimus.com",
	avatar: "https://avatars.githubusercontent.com/u/84121071",
};

export function findConversation(id: string) {
	for (const group of conversationGroups) {
		const match = group.items.find((item) => item.id === id);
		if (match) {
			return match;
		}
	}
	return undefined;
}
