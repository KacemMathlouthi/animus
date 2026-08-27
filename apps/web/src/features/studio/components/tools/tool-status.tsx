/** Display state for a tool step that produced no result: it threw, the user
 * stopped it, or the turn was cut off. A cut stream leaves the part looking
 * exactly as it did while running, which is why liveness is an input here.
 * HITL tools skip this: their pending state means "waiting for you". */

import { CircleSlashIcon, TriangleAlertIcon } from "lucide-react";
import { Shimmer } from "@/components/ai-elements/shimmer";

export type ToolPhase = "failed" | "running" | "unfinished";

/** Every SDK tool-part state except `output-available`, which callers narrow
 * themselves since it is the only one where `input` and `output` are typed. */
type PendingToolState =
  | "approval-requested"
  | "approval-responded"
  | "input-available"
  | "input-streaming"
  | "output-denied"
  | "output-error";

/** `isLive` is whether the message is still streaming: without it, a killed
 * turn is indistinguishable from a running one. */
export function toolPhase(state: PendingToolState, isLive: boolean): ToolPhase {
  // output-denied is unreachable today (no tool requests approval) but is a
  // refusal either way.
  if (state === "output-error" || state === "output-denied") {
    return "failed";
  }
  return isLive ? "running" : "unfinished";
}

/** `running` and `stopped` are per-caller wording for the non-error phases. */
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
