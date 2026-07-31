import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroPrompt } from "@/features/landing/components/hero-prompt";
import { cn } from "@/lib/utils";

/** Intrinsic size of the hero engravings, declared so the browser reserves the
 * right box before the files land. The launch video's poster reuses the same
 * pair and carries its own copy of these numbers.
 *
 * The two heights differ on purpose: the dark plate is cropped at the top to
 * settle it against the light one, which the pair being two separate
 * generations of one composition had left drifting during the cross-fade. Both
 * plates are bottom-anchored, so the shorter one simply starts lower and the
 * artwork lands in register — no transform involved. */
const PLATE_WIDTH = 3344;
const PLATE_HEIGHT_LIGHT = 1881;
const PLATE_HEIGHT_DARK = 1833;

/** Shared by both plates so the cross-fading pair can never fall out of
 * register.
 *
 * Mobile fills: `object-cover` anchored to the bottom crops the empty upper field
 * and keeps the engraved ground line, so a narrow viewport is covered edge to
 * edge instead of the plate sitting as a short band. Desktop releases `top` so
 * `h-auto` can take the artwork's natural 16:9 at full width, bottom-anchored.
 *
 * Both edges fade into the page, but by very different amounts. The bottom ramp
 * is short on purpose — it used to run to 22%, which bleached the whole engraved
 * ground line into the page and read as a band of tint. At 6% it is just enough
 * to take the hard cut off the edge. The top still fades long, from 52% up, to
 * keep the fixed header off the artwork. Each end carries a mid-alpha stop so the
 * ramp bends like an ease instead of showing a knee where it leaves black.
 *
 * Every class here must stay a literal string: Tailwind scans source text, so an
 * interpolated arbitrary property generates no CSS and the mask would silently
 * disappear. */
const PLATE_CLASSES = [
  "absolute inset-0 h-full w-full object-cover object-bottom md:top-auto md:h-auto",
  "transition-opacity duration-700 ease-fluid",
  "[-webkit-mask-image:linear-gradient(to_top,transparent_0%,rgba(0,0,0,0.55)_2%,black_6%,black_52%,rgba(0,0,0,0.4)_76%,transparent_95%)]",
  "[mask-image:linear-gradient(to_top,transparent_0%,rgba(0,0,0,0.55)_2%,black_6%,black_52%,rgba(0,0,0,0.4)_76%,transparent_95%)]",
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
          height={PLATE_HEIGHT_LIGHT}
          src="/hero/hero-light.avif"
          width={PLATE_WIDTH}
        />
        <img
          alt=""
          className={cn(PLATE_CLASSES, "opacity-0 dark:opacity-100")}
          height={PLATE_HEIGHT_DARK}
          src="/hero/hero-dark.avif"
          width={PLATE_WIDTH}
        />
        {/* Legibility veil, now a light touch in both themes. The engravings
         * hold their own empty centre, so the copy already clears AA without
         * help (18.7:1 headline, 4.7:1 tagline on the bare light plate) and the
         * veil's only remaining effect is washing the ink out — 25% white took
         * the loam ink from #48290d to a muddy #765f4a. */}
        <div className="absolute inset-0 bg-background/10" />
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
