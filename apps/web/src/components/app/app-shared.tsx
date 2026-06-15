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
			{ id: "c1", title: "How neural networks learn" },
			{ id: "c2", title: "The Fourier transform, visually" },
		],
	},
	{
		label: "Yesterday",
		items: [
			{ id: "c3", title: "Why the sky is blue" },
			{ id: "c4", title: "Bubble sort vs quicksort" },
		],
	},
	{
		label: "Previous 7 days",
		items: [
			{ id: "c5", title: "Eigenvectors, explained" },
			{ id: "c6", title: "How GPS triangulation works" },
			{ id: "c7", title: "The Monty Hall problem" },
		],
	},
];
