import {
  FileCode2Icon,
  FilePenIcon,
  FilesIcon,
  FileTextIcon,
} from "lucide-react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { AgentMark } from "@/components/brand/agent-mark";
import { UserAvatar } from "@/components/user-avatar";
import { AskUserQuestionTool } from "@/features/studio/components/tools/ask-user-question";
import { FinalizeVideoPlanTool } from "@/features/studio/components/tools/finalize-video-plan";
import {
  ManimStep,
  RenderSceneTool,
  RunCommandTool,
} from "@/features/studio/components/tools/manim-tools";
import {
  ToolActivity,
  toolPhase,
} from "@/features/studio/components/tools/tool-status";
import {
  WebFetchTool,
  WebSearchTool,
} from "@/features/studio/components/tools/web-research";
import type { AnimusUIMessage, RespondToTool } from "@/features/studio/types";
import { useSession } from "@/lib/auth-client";

/** stagger:0 is load-bearing: a nonzero stagger delays each word by its index,
 * letting a later chunk overtake an earlier one's tail. Needs the keyframes in
 * `streamdown/styles.css`, imported from index.css. */
const STREAM_ANIMATION = {
  animation: "blurIn",
  duration: 200,
  easing: "ease-out",
  sep: "word",
  stagger: 0,
} as const;

function AgentAvatar() {
  return <AgentMark className="size-8 shrink-0 rounded-sm" />;
}

function MessageUserAvatar() {
  const { data } = useSession();
  const user = data?.user;
  return (
    <UserAvatar
      className="size-8 shrink-0"
      email={user?.email}
      image={user?.image}
      name={user?.name}
      square
    />
  );
}

function textOf(message: AnimusUIMessage): string {
  let out = "";
  for (const part of message.parts) {
    if (part.type === "text") {
      out += part.text;
    }
  }
  return out;
}

export function ChatMessage({
  message,
  isStreaming = false,
  respondToTool,
  onOpenVideo,
}: {
  message: AnimusUIMessage;
  isStreaming?: boolean;
  respondToTool: RespondToTool;
  onOpenVideo?: (key: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3">
        <Message className="ml-0 max-w-[80%]" from="user">
          <MessageContent className="wrap-break-word whitespace-pre-wrap">
            {textOf(message)}
          </MessageContent>
        </Message>
        <MessageUserAvatar />
      </div>
    );
  }

  // Every tool branch below checks `output-available` first (the only state
  // where input and output are typed) and passes `isStreaming`, which is what
  // tells a cut-off step from a running one. See toolPhase.
  return (
    <div className="flex items-start gap-3">
      <AgentAvatar />
      <Message className="max-w-full flex-1 sm:max-w-[80%]" from="assistant">
        {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one branch per tool part type; the shape is a flat dispatch table, and splitting it hides that */}
        {message.parts.map((part, index) => {
          // Parts are append-only, so index keys are stable.
          const key = `${message.id}-${index}`;

          if (part.type === "reasoning") {
            return part.text ? (
              <Reasoning key={key}>
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            ) : null;
          }

          if (part.type === "text") {
            return part.text ? (
              <MessageContent key={key}>
                <MessageResponse
                  animated={STREAM_ANIMATION}
                  isAnimating={isStreaming && part.state === "streaming"}
                >
                  {part.text}
                </MessageResponse>
              </MessageContent>
            ) : null;
          }

          // HITL tools handle their own pending state: "waiting for an answer"
          // stays valid after the turn ends, so it is never unfinished.
          if (part.type === "tool-askUserQuestion") {
            if (part.state === "output-error") {
              return (
                <ToolActivity
                  errorText={part.errorText}
                  key={part.toolCallId}
                  phase="failed"
                  running="Preparing a question…"
                  stopped="Couldn't ask the question"
                />
              );
            }
            if (part.state !== "input-streaming" && part.input) {
              return (
                <AskUserQuestionTool
                  input={part.input}
                  key={part.toolCallId}
                  onRespond={(output) =>
                    respondToTool("askUserQuestion", part.toolCallId, output)
                  }
                  output={
                    part.state === "output-available" ? part.output : undefined
                  }
                />
              );
            }
            return (
              <Shimmer key={part.toolCallId}>Preparing a question…</Shimmer>
            );
          }

          if (part.type === "tool-finalizeVideoPlan") {
            if (part.state === "output-error") {
              return (
                <ToolActivity
                  errorText={part.errorText}
                  key={part.toolCallId}
                  phase="failed"
                  running="Drafting a plan…"
                  stopped="Couldn't draft the plan"
                />
              );
            }
            if (part.state !== "input-streaming" && part.input) {
              return (
                <FinalizeVideoPlanTool
                  input={part.input}
                  key={part.toolCallId}
                  onRespond={(output) =>
                    respondToTool("finalizeVideoPlan", part.toolCallId, output)
                  }
                  output={
                    part.state === "output-available" ? part.output : undefined
                  }
                />
              );
            }
            return <Shimmer key={part.toolCallId}>Drafting a plan…</Shimmer>;
          }

          if (part.type === "tool-webSearch") {
            if (part.state === "output-available") {
              return (
                <WebSearchTool
                  input={part.input}
                  key={part.toolCallId}
                  output={part.output}
                />
              );
            }
            return (
              <ToolActivity
                detail={part.input?.query}
                errorText={
                  part.state === "output-error" ? part.errorText : undefined
                }
                key={part.toolCallId}
                phase={toolPhase(part.state, isStreaming)}
                running={"Searching the web…"}
                stopped="Search didn't finish"
              />
            );
          }

          if (part.type === "tool-webFetch") {
            if (part.state === "output-available") {
              return (
                <WebFetchTool
                  input={part.input}
                  key={part.toolCallId}
                  output={part.output}
                />
              );
            }
            return (
              <ToolActivity
                detail={part.input?.urls?.join(", ")}
                errorText={
                  part.state === "output-error" ? part.errorText : undefined
                }
                key={part.toolCallId}
                phase={toolPhase(part.state, isStreaming)}
                running={"Reading pages…"}
                stopped="Fetch didn't finish"
              />
            );
          }

          if (part.type === "tool-writeFile") {
            if (part.state === "output-available") {
              return (
                <ManimStep
                  detail={part.input.path}
                  icon={<FileCode2Icon className="size-3.5" />}
                  key={part.toolCallId}
                  title="Wrote file"
                />
              );
            }
            return (
              <ToolActivity
                detail={part.input?.path}
                errorText={
                  part.state === "output-error" ? part.errorText : undefined
                }
                key={part.toolCallId}
                phase={toolPhase(part.state, isStreaming)}
                running={"Writing a scene…"}
                stopped="Write didn't finish"
              />
            );
          }

          if (part.type === "tool-editFile") {
            if (part.state === "output-available") {
              return (
                <ManimStep
                  detail={part.input.path}
                  icon={<FilePenIcon className="size-3.5" />}
                  key={part.toolCallId}
                  title="Edited file"
                />
              );
            }
            return (
              <ToolActivity
                detail={part.input?.path}
                errorText={
                  part.state === "output-error" ? part.errorText : undefined
                }
                key={part.toolCallId}
                phase={toolPhase(part.state, isStreaming)}
                running={"Editing a file…"}
                stopped="Edit didn't finish"
              />
            );
          }

          if (part.type === "tool-readFile") {
            if (part.state === "output-available") {
              return (
                <ManimStep
                  detail={part.input.path}
                  icon={<FileTextIcon className="size-3.5" />}
                  key={part.toolCallId}
                  title="Read file"
                />
              );
            }
            return (
              <ToolActivity
                detail={part.input?.path}
                errorText={
                  part.state === "output-error" ? part.errorText : undefined
                }
                key={part.toolCallId}
                phase={toolPhase(part.state, isStreaming)}
                running={"Reading a file…"}
                stopped="Read didn't finish"
              />
            );
          }

          if (part.type === "tool-listFiles") {
            if (part.state === "output-available") {
              return (
                <ManimStep
                  detail={part.input.path}
                  icon={<FilesIcon className="size-3.5" />}
                  key={part.toolCallId}
                  title="Listed files"
                />
              );
            }
            return (
              <ToolActivity
                detail={part.input?.path}
                errorText={
                  part.state === "output-error" ? part.errorText : undefined
                }
                key={part.toolCallId}
                phase={toolPhase(part.state, isStreaming)}
                running={"Listing files…"}
                stopped="Listing didn't finish"
              />
            );
          }

          if (part.type === "tool-runCommand") {
            if (part.state === "output-available") {
              return (
                <RunCommandTool
                  input={part.input}
                  key={part.toolCallId}
                  output={part.output}
                />
              );
            }
            return (
              <ToolActivity
                detail={part.input?.command}
                errorText={
                  part.state === "output-error" ? part.errorText : undefined
                }
                key={part.toolCallId}
                phase={toolPhase(part.state, isStreaming)}
                running={"Running a command…"}
                stopped="Command didn't finish"
              />
            );
          }

          if (part.type === "tool-renderScene") {
            if (part.state === "output-available") {
              return (
                <RenderSceneTool
                  input={part.input}
                  key={part.toolCallId}
                  onOpen={onOpenVideo}
                  output={part.output}
                />
              );
            }
            return (
              <ToolActivity
                detail={part.input?.scene}
                errorText={
                  part.state === "output-error" ? part.errorText : undefined
                }
                key={part.toolCallId}
                phase={toolPhase(part.state, isStreaming)}
                running={
                  part.input
                    ? `Rendering ${part.input.scene}…`
                    : "Preparing render…"
                }
                stopped="Render didn't finish"
              />
            );
          }

          return null;
        })}
      </Message>
    </div>
  );
}
