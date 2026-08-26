/** Shared display state for the agent's server-executed tools.
 *
 * Three ways a tool step can end without a result, and until now the UI showed
 * the same pulsing shimmer for all of them — forever, including on every later
 * page load:
 *
 * - it threw (`output-error`), which carries a reason worth showing;
 * - the turn was stopped by the user mid-step;
 * - the turn was cut off (the platform's request cap kills a long render), so
 *   the part is frozen in a pending state and no further event is ever coming.
 *
 * The last one is why "is the turn still live?" has to be an input here. A cut
 * stream leaves the part exactly as it looked while running, so the state alone
 * cannot tell the difference — only the fact that nothing is streaming any more.
 *
 * Human-in-the-loop tools (askUserQuestion, finalizeVideoPlan) deliberately do
 * NOT use this: their pending state means "waiting for you", which stays valid
 * after the turn ends and is answerable at any time. */

import { CircleSlashIcon, TriangleAlertIcon } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";

/** How a tool step that has not produced a result should read. */
export type ToolPhase = "failed" | "running" | "unfinished";

/** Every tool-part state the AI SDK can report, minus the one that means the
 * step succeeded. Callers narrow `output-available` themselves (it is the only
 * state where `input` and `output` are fully typed), so excluding it here lets
 * `toolPhase` promise it never returns a "done" phase. */
type PendingToolState =
  | "approval-requested"
  | "approval-responded"
  | "input-available"
  | "input-streaming"
  | "output-denied"
  | "output-error";

/** Map a tool part's raw state to what the user should see. `isLive` is whether
 * this message is still streaming: without it, a killed turn is indistinguishable
 * from a running one. */
export function toolPhase(state: PendingToolState, isLive: boolean): ToolPhase {
  // output-denied is the approval flow rejecting a call. No tool here requests
  // approval, so it is unreachable today, but it is a refusal either way.
  if (state === "output-error" || state === "output-denied") {
    return "failed";
  }
  return isLive ? "running" : "unfinished";
}

/** Render a tool step that has not produced a result. `running` and `stopped`
 * are the labels for the two non-error phases, so each caller supplies wording
 * that fits its own step. */
export function ToolActivity({
  phase,
  running,
  stopped,
  detail,
  errorText,
}: {
  detail?: string;
  errorText?: string;
  phase: ToolPhase;
  running: string;
  stopped: string;
}) {
  if (phase === "running") {
    return <Shimmer>{running}</Shimmer>;
  }

  const failed = phase === "failed";
  return (
    <div
      className={
        failed
          ? "my-1.5 rounded-sm border border-destructive/40 bg-destructive/5 px-2.5 py-1.5"
          : "my-1.5 rounded-sm border border-dashed bg-muted/30 px-2.5 py-1.5"
      }
    >
      <div className="flex items-center gap-2">
        {failed ? (
          <TriangleAlertIcon className="size-3.5 shrink-0 text-destructive" />
        ) : (
          <CircleSlashIcon className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="shrink-0 font-medium text-sm">{stopped}</span>
        {detail ? (
          <code className="min-w-0 flex-1 truncate font-mono text-muted-foreground text-xs">
            {detail}
          </code>
        ) : null}
      </div>
      <p className="mt-1 pl-5 text-xs">
        {failed ? (
          <span className="text-destructive">
            {errorText || "The step failed without a reason."}
          </span>
        ) : (
          <span className="text-muted-foreground">
            The turn ended before this step reported back. Send a message to
            pick it up again.
          </span>
        )}
      </p>
    </div>
  );
}
