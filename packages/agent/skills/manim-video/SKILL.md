---
name: manim-video
description: "Manim CE animations: 3Blue1Brown math/algo videos."
version: 1.0.0
platforms: [linux, macos, windows]
---

# Manim Video Production Pipeline

> **animus adaptation — read this first.** animus uses this skill for its *craft*
> (visual design, layout, frame-safety, pacing, typography), NOT its
> pipeline. In animus the whole video is ONE VoiceoverScene rendered ONCE via the
> `renderScene` tool — see "Pipeline" below. Use the design rules and the
> `references/` files as technique references; the values stated throughout
> this skill (background, font, narration call) already match animus's
> defaults, so there is nothing left to override.

## When to use

Use when users request: animated explanations, math animations, concept visualizations, algorithm walkthroughs, technical explainers, 3Blue1Brown style videos, or any programmatic animation with geometric/mathematical content. Creates 3Blue1Brown-style explainer videos, algorithm visualizations, equation derivations, architecture diagrams, and data stories using Manim Community Edition.

## Creative Standard

This is educational cinema. Every frame teaches. Every animation reveals structure.

**Before writing a single line of code**, articulate the narrative arc. What misconception does this correct? What is the "aha moment"? What visual story takes the viewer from confusion to understanding? The user's prompt is a starting point — interpret it with pedagogical ambition.

**Geometry before algebra.** Show the shape first, the equation second. Visual memory encodes faster than symbolic memory. When the viewer sees the geometric pattern before the formula, the equation feels earned.

**First-render excellence is non-negotiable.** The output must be visually clear and aesthetically cohesive without revision rounds. If something looks cluttered, poorly timed, or like "AI-generated slides," it is wrong.

**Opacity layering directs attention.** Never show everything at full brightness. Primary elements at 1.0, contextual elements at 0.4, structural elements (axes, grids) at 0.15. The brain processes visual salience in layers.

**Breathing room.** Every animation needs `self.wait()` after it. The viewer needs time to absorb what just appeared. Never rush from one animation to the next. A 2-second pause after a key reveal is never wasted.

**Cohesive visual language.** All scenes share a color palette, consistent typography sizing, matching animation speeds. A technically correct video where every scene uses random different colors is an aesthetic failure.

## Prerequisites

Run `scripts/setup.sh` to verify all dependencies. Requires: Python 3.10+, Manim Community Edition v0.20+ (`pip install manim`), LaTeX (`texlive-full` on Linux, `mactex` on macOS), and ffmpeg. Reference docs tested against Manim CE v0.20.1.

## Modes

| Mode | Input | Output | Reference |
|------|-------|--------|-----------|
| **Concept explainer** | Topic/concept | Animated explanation with geometric intuition | `references/scene-planning.md` |
| **Equation derivation** | Math expressions | Step-by-step animated proof | `references/equations.md` |
| **Algorithm visualization** | Algorithm description | Step-by-step execution with data structures | `references/graphs-and-data.md` |
| **Data story** | Data/metrics | Animated charts, comparisons, counters | `references/graphs-and-data.md` |
| **Architecture diagram** | System description | Components building up with connections | `references/mobjects.md` |
| **Paper explainer** | Research paper | Key findings and methods animated | `references/scene-planning.md` |
| **3D visualization** | 3D concept | Rotating surfaces, parametric curves, spatial geometry | `references/camera-and-3d.md` |

## Stack

Single Python script per project. No browser, no Node.js, no GPU required.

| Layer | Tool | Purpose |
|-------|------|---------|
| Core | Manim Community Edition | Scene rendering, animation engine |
| Math | LaTeX (texlive/MiKTeX) | Equation rendering via `MathTex` |
| Video I/O | ffmpeg | Format conversion, background-music muxing (animus, after rendering) |
| TTS | ElevenLabs | Narration voiceover, via manim-voiceover |

## Pipeline

animus renders ONE continuous `VoiceoverScene` ONCE via the `renderScene`
tool — there is no separate plan file, no per-scene classes, and no ffmpeg
stitching step. The flow is:

1. **WRITE** — compose the whole video as a single `VoiceoverScene` subclass
   whose `construct` plays every planned section in sequence.
2. **TEST-RENDER** — `python3 -m manim render -ql scene.py SceneName` to
   check the scene compiles and reads cleanly; iterate with `editFile`.
3. **DELIVER** — call `renderScene` exactly once, at high quality, on the
   finished scene.

## Project Structure

One or more Python files in the sandbox's working directory; the `construct`
method of a single entry scene file (e.g. `scene.py`) plays the whole video.
Splitting helper code into other files is fine — what matters is exactly one
render of one scene at the end. Manim writes its render artifacts under
`media/` as usual; `renderScene` pulls the final mp4 out for you.

## Creative Direction

### Color Palettes

Pick PRIMARY/SECONDARY/ACCENT against Manim's default black background (see
"Visual craft" in the system prompt — the background is never overridden):

| Palette | Primary | Secondary | Accent | Use case |
|---------|---------|--------|--------|--------|
| **Classic 3B1B** | `#58C4DD` (BLUE) | `#83C167` (GREEN) | `#FFFF00` (YELLOW) | General math/CS |
| **Warm academic** | `#FF6B6B` | `#FFD93D` | `#6BCB77` | Approachable |
| **Neon tech** | `#00F5FF` | `#FF00FF` | `#39FF14` | Systems, architecture |
| **Monochrome** | `#EAEAEA` | `#888888` | `#FFFFFF` | Minimalist |

### Animation Speed

| Context | run_time | self.wait() after |
|---------|----------|-------------------|
| Title/intro appear | 1.5s | 1.0s |
| Key equation reveal | 2.0s | 2.0s |
| Transform/morph | 1.5s | 1.5s |
| Supporting label | 0.8s | 0.5s |
| FadeOut cleanup | 0.5s | 0.3s |
| "Aha moment" reveal | 2.5s | 3.0s |

### Typography Scale

| Role | Font size | Usage |
|------|-----------|-------|
| Title | 48 | Scene titles, opening text |
| Heading | 36 | Section headers within a scene |
| Body | 30 | Explanatory text |
| Label | 24 | Annotations, axis labels |
| Caption | 20 | Subtitles, fine print |

### Fonts

Use the LaTeX serif for all text — it's installed via TeX Live and renders
consistently in this sandbox. Avoid common proportional fonts like
`"Helvetica"`/`"Arial"`/`"SF Pro"`: Manim's Pango renderer can produce
uneven kerning with them, and they aren't installed here anyway.

```python
FONT = "Latin Modern Roman"  # define once at top of file

Text("Fourier Series", font_size=48, font=FONT, weight=BOLD)  # titles
Text("n=1: sin(x)", font_size=20, font=FONT)                  # labels
MathTex(r"\nabla L")                                            # math (uses LaTeX)
```

Minimum `font_size=18` for readability.

### Section Variation

Vary each section of the video so it doesn't feel repetitive:
- **Different dominant color** from the palette
- **Different layout** — don't always center everything
- **Different animation entry** — vary between Write, FadeIn, GrowFromCenter, Create
- **Different visual weight** — some sections dense, others sparse

## Workflow

### Write the scene

Compose the whole video as one `VoiceoverScene` subclass.

```python
from manim import *
from manim_voiceover import VoiceoverScene
from manim_voiceover.services.elevenlabs import ElevenLabsService

PRIMARY = "#58C4DD"
SECONDARY = "#83C167"
ACCENT = "#FFFF00"
FONT = "Latin Modern Roman"

class Explainer(VoiceoverScene):
    def construct(self):
        self.set_speech_service(ElevenLabsService(
            voice_name="Rachel", model="eleven_multilingual_v2", transcription_model=None
        ))
        title = Text("Why Does This Work?", font_size=48, color=PRIMARY, weight=BOLD, font=FONT)
        with self.voiceover(text="Why does this work?") as tracker:
            self.play(Write(title), run_time=tracker.duration)
        self.wait(1.0)
        self.play(FadeOut(title), run_time=0.5)
```

Key patterns:
- **Shared color constants** at file top for visual consistency
- **Clean exits** — FadeOut a finished section before reusing its space: `self.play(FadeOut(Group(*self.mobjects)))`

### Test-render

```bash
python3 -m manim render -ql scene.py Explainer  # draft, for your own verification
```

### Deliver

Call the `renderScene` tool exactly once, on the finished scene, at high quality.

## Critical Implementation Notes

### Raw Strings for LaTeX
```python
# WRONG: MathTex("\frac{1}{2}")
# RIGHT:
MathTex(r"\frac{1}{2}")
```

### buff >= 0.5 for Edge Text
```python
label.to_edge(DOWN, buff=0.5)  # never < 0.5
```

### FadeOut Before Replacing Text
```python
self.play(ReplacementTransform(note1, note2))  # not Write(note2) on top
```

### Never Animate Non-Added Mobjects
```python
self.play(Create(circle))  # must add first
self.play(circle.animate.set_color(RED))  # then animate
```

## Performance Targets

| Quality | Resolution | FPS | Speed |
|---------|-----------|-----|-------|
| `-ql` (draft) | 854x480 | 15 | 5-15s/scene |
| `-qm` (medium) | 1280x720 | 30 | 15-60s/scene |
| `-qh` (production) | 1920x1080 | 60 | 30-120s/scene |

Always iterate at `-ql`. Only render `-qh` for final output.

## References

| File | Contents |
|------|----------|
| `references/animations.md` | Core animations, rate functions, composition, `.animate` syntax, timing patterns |
| `references/mobjects.md` | Text, shapes, VGroup/Group, positioning, styling, custom mobjects |
| `references/visual-design.md` | 12 design principles, opacity layering, layout templates, color palettes |
| `references/equations.md` | LaTeX in Manim, TransformMatchingTex, derivation patterns |
| `references/graphs-and-data.md` | Axes, plotting, BarChart, animated data, algorithm visualization |
| `references/camera-and-3d.md` | MovingCameraScene, ThreeDScene, 3D surfaces, camera control |
| `references/scene-planning.md` | Narrative arcs, layout templates, scene transitions, planning template |
| `references/rendering.md` | CLI reference, quality presets, ffmpeg, voiceover workflow, GIF export |
| `references/troubleshooting.md` | LaTeX errors, animation errors, common mistakes, debugging |
| `references/animation-design-thinking.md` | When to animate vs show static, decomposition, pacing, narration sync |
| `references/updaters-and-trackers.md` | ValueTracker, add_updater, always_redraw, time-based updaters, patterns |
| `references/paper-explainer.md` | Turning research papers into animations — workflow, templates, domain patterns |
| `references/decorations.md` | SurroundingRectangle, Brace, arrows, DashedLine, Angle, annotation lifecycle |
| `references/production-quality.md` | Pre-code, pre-render, post-render checklists, spatial layout, color, tempo |

---

## Creative Divergence (use only when user requests experimental/creative/unique output)

If the user asks for creative, experimental, or unconventional explanatory approaches, select a strategy and reason through it BEFORE designing the animation.

- **SCAMPER** — when the user wants a fresh take on a standard explanation
- **Assumption Reversal** — when the user wants to challenge how something is typically taught

### SCAMPER Transformation
Take a standard mathematical/technical visualization and transform it:
- **Substitute**: replace the standard visual metaphor (number line → winding path, matrix → city grid)
- **Combine**: merge two explanation approaches (algebraic + geometric simultaneously)
- **Reverse**: derive backward — start from the result and deconstruct to axioms
- **Modify**: exaggerate a parameter to show why it matters (10x the learning rate, 1000x the sample size)
- **Eliminate**: remove all notation — explain purely through animation and spatial relationships

### Assumption Reversal
1. List what's "standard" about how this topic is visualized (left-to-right, 2D, discrete steps, formal notation)
2. Pick the most fundamental assumption
3. Reverse it (right-to-left derivation, 3D embedding of a 2D concept, continuous morphing instead of steps, zero notation)
4. Explore what the reversal reveals that the standard approach hides
