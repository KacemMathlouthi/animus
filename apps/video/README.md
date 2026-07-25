# @animus/video

The animus launch video, built in [Remotion](https://remotion.dev) as code.

The film is the deck in `launch-video/slides.typ` executed: four beats (hook,
demo, features, ask), 73 seconds, 1920×1080 at 60fps, cut for X, YouTube and
the landing page's `#video` section.

## Why Remotion, and why it lives in the monorepo

The video advertises an interface, so it should *be* that interface rather than
a redrawing of it. `src/styles.css` imports `apps/web/src/index.css` directly:
every colour token, radius, gradient, font and keyframe on screen is the one the
product ships. The mark, the prompt shell, the tool cards and the studio chrome
are rebuilt from the app's own class names. Change the brand and re-render, and
the film follows.

The one thing deliberately *not* imported is behaviour: the app's components
carry routing, auth and data hooks that a renderer has no business booting, and
Remotion needs every animation driven by frame number rather than a wall clock.
So the film owns the motion and the app owns the look.

## Commands

```bash
bun run studio     # Remotion Studio, the live editor
bun run render     # → out/launch.mp4
bun run typecheck
```

Ship a cut by copying it to the web app, which already serves it at `#video`:

```bash
cp out/launch.mp4 ../web/public/launch.mp4
```

## Layout

```
src/
  Root.tsx            registers the single composition
  launch-video.tsx    the cut: scenes laid end to end, plus the score
  lib/timing.ts       the spine — scene order and length, in seconds
  lib/motion.ts       the product's --ease-* tokens as Remotion easings
  lib/score.ts        the soundtrack slot (see below)
  components/         brand and interface pieces (mark, prompt, studio, chat)
  components/fourier-scene.tsx   the explainer the film renders on screen
  scenes/             one file per beat
public/               symlinks into apps/web/public, so assets never fork
```

Retiming the edit means editing `lib/timing.ts`; nothing downstream hardcodes a
start frame.

## The Fourier scene

The payoff shot is a real Fourier series, not a mock: odd harmonics, amplitude
4/(πk), angular speed k, chained tip to tail, with the curve sampled backwards
through time so it unrolls as the epicycles turn. It is SVG, so the camera can
fly into it without losing an edge.

## The soundtrack

The proposal specifies "In the Hall of the Mountain King" (Trent Reznor and
Atticus Ross, *The Social Network*, 2010). That is a commercial master: it
cannot live in this repository, and using it on YouTube or the landing page
needs a sync licence (expect Content ID on YouTube without one).

`public/soundtrack.m4a` is therefore a **silent placeholder of the right
length**, and the edit is cut to the arrangement's shape without it. To score
the film, drop the licensed audio into `public/` and point `SOUNDTRACK_FILE` in
`src/lib/score.ts` at it — the volume automation in `launch-video.tsx` is
written against the film's beats, so nothing else changes.

Render a silent cut with `bunx remotion render LaunchVideo out/launch.mp4
--props='{"soundtrack":false}'`.
