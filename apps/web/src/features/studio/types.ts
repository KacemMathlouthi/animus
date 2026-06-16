type StudioRole = "user" | "assistant";

type StudioSource = { href: string; title: string };

export type StudioMessage = {
	id: string;
	role: StudioRole;
	text: string;
	reasoning?: string;
	sources?: StudioSource[];
};

export type StudioPhase = "idle" | "loading" | "chat";

export type RenderStatus = "rendering" | "ready";
