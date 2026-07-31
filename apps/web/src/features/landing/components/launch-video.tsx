import { useState } from "react";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/features/landing/components/full-width-divider";
import { cn } from "@/lib/utils";

/** Intrinsic size of the hero paintings reused as the poster. The hero declares
 * the same pair; keep the two in step if the artwork is re-exported. */
const PLATE_WIDTH = 3344;
const PLATE_HEIGHT = 1882;

const posterClasses = cn(
  "pointer-events-none absolute inset-0 h-full w-full object-cover",
  "transition-opacity duration-700 ease-fluid"
);

/** The "See animus in action" section. Expects the launch video at
 * `public/launch.mp4`; the hero's "Watch the video" button scrolls here via `#video`.
 * Until playback starts, a theme-aware poster overlay (the hero art, cross-fading
 * with the light/dark toggle like the hero itself) covers the player — the native
 * `poster` attribute can't follow a class-driven theme. */
export function LaunchVideo() {
  const [playing, setPlaying] = useState(false);

  return (
    <section
      className="relative flex min-h-svh scroll-mt-20 flex-col items-center justify-center gap-10 px-4 py-20"
      id="video"
    >
      <DecorIcon className="size-4" position="top-left" />
      <DecorIcon className="size-4" position="top-right" />
      <DecorIcon className="size-4" position="bottom-left" />
      <DecorIcon className="size-4" position="bottom-right" />

      <div className="max-w-2xl space-y-3 text-center">
        <p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
          Watch
        </p>
        <h2 className="font-medium text-3xl text-foreground tracking-tight md:text-5xl">
          See animus in action
        </h2>
        <p className="text-balance text-muted-foreground md:text-lg">
          One prompt becomes a narrated, animated explainer, researched,
          scripted, and animated end to end.
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-4xl px-4 md:px-8">
        <div
          aria-hidden="true"
          className="absolute -inset-4 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,theme(--color-primary/.22),transparent_70%)] blur-2xl"
        />
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted shadow-2xl">
          <DecorIcon className="size-4" position="top-left" />
          <DecorIcon className="size-4" position="top-right" />
          <DecorIcon className="size-4" position="bottom-left" />
          <DecorIcon className="size-4" position="bottom-right" />
          <video
            aria-label="animus launch video"
            className="h-full w-full object-cover"
            controls
            onPlay={() => setPlaying(true)}
            playsInline
            preload="metadata"
          >
            <source src="/launch.mp4" type="video/mp4" />
            <track kind="captions" />
          </video>
          {playing ? null : (
            <>
              <img
                alt=""
                className={cn(posterClasses, "opacity-100 dark:opacity-0")}
                height={PLATE_HEIGHT}
                src="/hero/hero-light.avif"
                width={PLATE_WIDTH}
              />
              <img
                alt=""
                className={cn(posterClasses, "opacity-0 dark:opacity-100")}
                height={PLATE_HEIGHT}
                src="/hero/hero-dark.avif"
                width={PLATE_WIDTH}
              />
            </>
          )}
        </div>
      </div>

      <FullWidthDivider className="-bottom-px" />
    </section>
  );
}
