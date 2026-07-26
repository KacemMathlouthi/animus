import type { ChatStatus } from "ai";
import { MorphLogo } from "@/features/studio/components/morph-logo";
import { PromptSuggestions } from "@/features/studio/components/prompt-suggestions";
import { StudioPrompt } from "@/features/studio/components/studio-prompt";

export function StudioEmptyState({
  status,
  onSubmit,
}: {
  status?: ChatStatus;
  onSubmit: (text: string) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <MorphLogo className="h-32" />
      <div className="fade-in slide-in-from-bottom-2 animate-in space-y-2 fill-mode-backwards text-center delay-75 duration-500 ease-snappy">
        <h1 className="font-medium text-2xl tracking-tight">
          What do you want to understand?
        </h1>
        <p className="text-muted-foreground text-sm">
          Describe a topic and animus will research it and produce a narrated,
          animated explainer.
        </p>
      </div>
      <StudioPrompt
        className="fade-in slide-in-from-bottom-2 w-full animate-in fill-mode-backwards delay-150 duration-500 ease-snappy"
        onSubmit={onSubmit}
        placeholder="Explain how…"
        status={status}
      />
      <div className="fade-in slide-in-from-bottom-2 w-full animate-in fill-mode-backwards delay-200 duration-500 ease-snappy">
        <PromptSuggestions onSelect={onSubmit} />
      </div>
    </div>
  );
}
