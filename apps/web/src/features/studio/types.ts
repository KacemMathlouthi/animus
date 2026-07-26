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
 * addToolOutput are type-safe end to end. Mirrors the agent's tool registry.
 *
 * MUST stay a type alias, not an interface: the AI SDK's `UITools` constraint
 * is index-signature based, and an interface has no implicit index signature,
 * so converting this breaks `UIMessage`'s type argument. */
// biome-ignore lint/style/useConsistentTypeDefinitions: see above — an interface does not satisfy UITools
type AnimusTools = {
  askUserQuestion: {
    input: AskUserQuestionInput;
    output: AskUserQuestionOutput;
  };
  editFile: { input: EditFileInput; output: EditFileOutput };
  finalizeVideoPlan: { input: VideoPlan; output: FinalizeVideoPlanOutput };
  listFiles: { input: ListFilesInput; output: ListFilesOutput };
  readFile: { input: ReadFileInput; output: ReadFileOutput };
  renderScene: { input: RenderSceneInput; output: RenderSceneOutput };
  runCommand: { input: RunCommandInput; output: RunCommandOutput };
  webFetch: { input: WebFetchInput; output: WebFetchOutput };
  webSearch: { input: WebSearchInput; output: WebSearchOutput };
  writeFile: { input: WriteFileInput; output: WriteFileOutput };
};

export type AnimusUIMessage = UIMessage<never, UIDataTypes, AnimusTools>;

/** Sends a human-in-the-loop tool answer back to the agent. */
export type RespondToTool = (
  tool: "askUserQuestion" | "finalizeVideoPlan",
  toolCallId: string,
  output: AskUserQuestionOutput | FinalizeVideoPlanOutput
) => void;
