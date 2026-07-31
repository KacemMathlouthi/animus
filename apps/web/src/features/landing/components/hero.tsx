import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPrompt } from "@/features/landing/components/hero-prompt";
import { cn } from "@/lib/utils";

/** Intrinsic size of the hero paintings, declared so the browser reserves the
 * right box before the files land. The launch video's poster reuses the same
 * pair and carries its own copy of these numbers. */
const PLATE_WIDTH = 3344;
const PLATE_HEIGHT = 1882;

/** Shared by both plates so the cross-fading pair can never fall out of
 * register.
 *
 * Mobile fills: `object-cover` anchored to the bottom crops the sky and keeps the
 * flower foreground, so a narrow viewport is covered edge to edge instead of the
 * painting sitting as a short band. Desktop releases `top` so `h-auto` can take
 * the artwork's natural proportions at full width, bottom-anchored as before.
 *
 * Both edges fade into the page. The six stops are the smoothing: a two-stop ramp
 * puts a visible knee where it leaves black, so each end carries a mid-alpha stop
 * that bends the ramp into something closer to an ease. The top end reaching 95%
 * is what keeps the fixed header off the painting.
 *
 * Every class here must stay a literal string: Tailwind scans source text, so an
 * interpolated arbitrary property generates no CSS and the mask would silently
 * disappear. */
const PLATE_CLASSES = [
  "absolute inset-0 h-full w-full object-cover object-bottom md:top-auto md:h-auto",
  "transition-opacity duration-700 ease-fluid",
  "[-webkit-mask-image:linear-gradient(to_top,transparent_0%,rgba(0,0,0,0.35)_8%,black_22%,black_52%,rgba(0,0,0,0.4)_76%,transparent_95%)]",
  "[mask-image:linear-gradient(to_top,transparent_0%,rgba(0,0,0,0.35)_8%,black_22%,black_52%,rgba(0,0,0,0.4)_76%,transparent_95%)]",
].join(" ");

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-svh flex-col items-center justify-center gap-5 px-4 py-20">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-1 size-full overflow-hidden"
      >
        {/* AVIF with no fallback: the stylesheet's color-mix()/oklch() already
         * require newer browsers than AVIF does, so anything that can render
         * this page's colors can decode these. */}
        <img
          alt=""
          className={cn(PLATE_CLASSES, "opacity-100 dark:opacity-0")}
          fetchPriority="high"
          height={PLATE_HEIGHT}
          src="/hero/hero-light.avif"
          width={PLATE_WIDTH}
        />
        <img
          alt=""
          className={cn(PLATE_CLASSES, "opacity-0 dark:opacity-100")}
          height={PLATE_HEIGHT}
          src="/hero/hero-dark.avif"
          width={PLATE_WIDTH}
        />
        {/* Legibility veil. Light needs more than dark: its plate is a bright
         * high-key sky, so the same 15% that settles the night painting leaves
         * the day one hot. */}
        <div className="absolute inset-0 bg-background/25 dark:bg-background/15" />
        <div
          className={cn(
            "absolute -inset-x-20 inset-y-0 z-0 rounded-full",
            "bg-[radial-gradient(ellipse_at_center,theme(--color-foreground/.05),transparent,transparent)]",
            "blur-[50px]"
          )}
        />
        <div className="absolute inset-y-0 left-4 w-px bg-linear-to-b from-transparent via-border to-border md:left-8" />
        <div className="absolute inset-y-0 right-4 w-px bg-linear-to-b from-transparent via-border to-border md:right-8" />
        <div className="absolute inset-y-0 left-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:left-12" />
        <div className="absolute inset-y-0 right-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:right-12" />
      </div>

      <h1
        className={cn(
          "hero-copy max-w-3xl text-balance text-center font-medium text-4xl text-foreground tracking-tight md:text-6xl lg:text-7xl",
          "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-snappy"
        )}
      >
        <span className="block">
          Turn any{" "}
          <span className="hero-word -mr-3 -ml-[0.25em] pr-3 font-pixel-grid uppercase italic">
            question
          </span>
        </span>
        <span className="block text-[0.9em]">
          into an explainer{" "}
          <span className="hero-word font-bold font-pixel-grid uppercase">
            video
          </span>
        </span>
      </h1>

      <p
        className={cn(
          "hero-copy mb-1 text-center text-muted-foreground sm:whitespace-nowrap md:text-lg",
          "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-150 duration-500 ease-snappy"
        )}
      >
        Narrated, animated explainers that make anything click.
      </p>

      <HeroPrompt className="fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-snappy" />

      <div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center fill-mode-backwards delay-300 duration-500 ease-snappy">
        <Button
          asChild
          className="hero-raised border bg-card hover:bg-accent"
          variant="secondary"
        >
          <a href="#video">
            <PlayIcon data-icon="inline-start" /> Watch the video
          </a>
        </Button>
      </div>
    </section>
  );
}
