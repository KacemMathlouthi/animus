import type {
	AskUserQuestionInput,
	AskUserQuestionOutput,
	EditFileInput,
	EditFileOutput,
	FinalizeVideoPlanOutput,
	ListFilesInput,
	ListFilesOutput,
	ReadFileInput,
	ReadFileOutput,
	RenderSceneInput,
	RenderSceneOutput,
	RunCommandInput,
	RunCommandOutput,
	VideoPlan,
	WebFetchInput,
	WebFetchOutput,
	WebSearchInput,
	WebSearchOutput,
	WriteFileInput,
	WriteFileOutput,
} from "@animus/core/tools";
import type { UIDataTypes, UIMessage } from "ai";

/** Studio session view-state, shared by the chat hook and the stage. */
export type StudioPhase = "idle" | "loading" | "chat";

/** The agent's interactive tools, typed for useChat so message tool-parts and
 * addToolOutput are type-safe end to end. Mirrors the agent's tool registry. */
type AnimusTools = {
	askUserQuestion: {
		input: AskUserQuestionInput;
		output: AskUserQuestionOutput;
	};
	finalizeVideoPlan: { input: VideoPlan; output: FinalizeVideoPlanOutput };
	webFetch: { input: WebFetchInput; output: WebFetchOutput };
	webSearch: { input: WebSearchInput; output: WebSearchOutput };
	writeFile: { input: WriteFileInput; output: WriteFileOutput };
	editFile: { input: EditFileInput; output: EditFileOutput };
	readFile: { input: ReadFileInput; output: ReadFileOutput };
	listFiles: { input: ListFilesInput; output: ListFilesOutput };
	runCommand: { input: RunCommandInput; output: RunCommandOutput };
	renderScene: { input: RenderSceneInput; output: RenderSceneOutput };
};

export type AnimusUIMessage = UIMessage<never, UIDataTypes, AnimusTools>;

/** Sends a human-in-the-loop tool answer back to the agent. */
export type RespondToTool = (
	tool: "askUserQuestion" | "finalizeVideoPlan",
	toolCallId: string,
	output: AskUserQuestionOutput | FinalizeVideoPlanOutput,
) => void;
