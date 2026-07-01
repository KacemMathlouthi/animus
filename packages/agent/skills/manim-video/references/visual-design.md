# Visual Design Principles

## 12 Core Principles

1. **Geometry Before Algebra** — Show the shape first, the equation second.
2. **Opacity Layering** — PRIMARY=1.0, CONTEXT=0.4, GRID=0.15. Direct attention through brightness.
3. **One New Idea Per Scene** — Each scene introduces exactly one concept.
4. **Spatial Consistency** — Same concept occupies the same screen region throughout.
5. **Color = Meaning** — Assign colors to concepts, not mobjects. If velocity is blue, it stays blue.
6. **Progressive Disclosure** — Show simplest version first, add complexity incrementally.
7. **Transform, Don't Replace** — Use Transform/ReplacementTransform to show connections.
8. **Breathing Room** — `self.wait(1.5)` minimum after showing something new.
9. **Visual Weight Balance** — Don't cluster everything on one side.
10. **Consistent Motion Vocabulary** — Pick a small set of animation types and reuse them.
11. **Dark Background, Light Content** — Manim's default black background maximizes contrast with light content; leave it unset rather than overriding it.
12. **Intentional Empty Space** — Leave at least 15% of the frame empty.

## Layout Templates

### FULL_CENTER
One main element centered, title above, note below.
Best for: single equations, single diagrams, title cards.

### LEFT_RIGHT
Two elements side by side at x=-3.5 and x=3.5.
Best for: equation + visual, before/after, comparison.

### TOP_BOTTOM
Main element at y=1.5, supporting content at y=-1.5.
Best for: concept + examples, theorem + cases.

### GRID
Multiple elements via `arrange_in_grid()`.
Best for: comparison matrices, multi-step processes.

### PROGRESSIVE
Elements appear one at a time, arranged DOWN with aligned_edge=LEFT.
Best for: algorithms, proofs, step-by-step processes.

### ANNOTATED_DIAGRAM
Central diagram with floating labels connected by arrows.
Best for: architecture diagrams, annotated figures.

## Color Palettes

Pick PRIMARY/SECONDARY/ACCENT/HIGHLIGHT against Manim's default black
background — never set `self.camera.background_color`.

### Classic 3B1B
```python
PRIMARY=BLUE; SECONDARY=GREEN; ACCENT=YELLOW; HIGHLIGHT=RED
```

### Warm Academic
```python
PRIMARY="#FF6B6B"; SECONDARY="#FFD93D"; ACCENT="#6BCB77"
```

### Neon Tech
```python
PRIMARY="#00F5FF"; SECONDARY="#FF00FF"; ACCENT="#39FF14"
```

## Font Selection

Use the LaTeX serif, `"Latin Modern Roman"`, for all `Text()` — it's
installed via TeX Live and renders consistently in this sandbox. Avoid
common proportional fonts like Helvetica, Inter, SF Pro, or Arial: Manim's
Pango text renderer can produce broken kerning with them, and none of them
are installed here anyway.

### Recommended Font

| Use case | Font |
|----------|------|
| **All text (default)** | `"Latin Modern Roman"` |
| Math | Use `MathTex` (renders via LaTeX, not Pango) |

```python
FONT = "Latin Modern Roman"  # define once at top of file

title = Text("Fourier Series", font_size=48, color=PRIMARY, weight=BOLD, font=FONT)
label = Text("n=1: (4/pi) sin(x)", font_size=20, color=BLUE, font=FONT)
note = Text("Convergence at discontinuities", font_size=18, color=DIM, font=FONT)

# Math — always use MathTex, not Text
equation = MathTex(r"\nabla L = \frac{\partial L}{\partial w}")
```

### Font Availability

`"Latin Modern Roman"` ships with the sandbox's TeX Live install, so it's
always available — no fallback needed.

### Fine-Grained Text Control

`Text()` does not support `letter_spacing` or kerning parameters. For fine control, use `MarkupText` with Pango attributes:

```python
# Letter spacing (Pango units: 1/1024 of a point)
MarkupText('<span letter_spacing="6000">HERMES</span>', font_size=18, font="Latin Modern Roman")

# Bold specific words
MarkupText('This is <b>important</b>', font_size=24, font="Latin Modern Roman")

# Color specific words
MarkupText('Red <span foreground="#FF6B6B">warning</span>', font_size=24, font="Latin Modern Roman")
```

### Minimum Font Size

`font_size=18` is the minimum for readable text at any resolution. Below 18, characters become blurry at `-ql` and barely readable even at `-qh`.

## Visual Hierarchy Checklist

For every frame:
1. What is the ONE thing to look at? (brightest/largest)
2. What is context? (dimmed to 0.3-0.4)
3. What is structural? (dimmed to 0.15)
4. Enough empty space? (>15%)
5. All text readable at phone size?
