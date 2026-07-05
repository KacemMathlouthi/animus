/** Storytelling, structure, rigor and concrete technique lessons distilled from
 * reading the source of the best open-source explainer videos (3Blue1Brown,
 * Reducible, vcubingx, Theorem of Beethoven and others). Two layers: (1) the
 * topic-agnostic craft (pedagogy / story / design / rigor) that applies to any
 * subject — the sample skewed math/CS because that's what gets open-sourced, so
 * only patterns that generalize to physics, biology, finance, general topics are
 * kept; (2) concrete ManimCE code patterns worth reaching for. Snippets are
 * ManimCE (what we render), not 3b1b's ManimGL. This lives in the system prompt
 * (runtime-editable, no snapshot rebuild) as the interim home; the long-tail,
 * technique-by-technique detail still lives in the bundled manim-video skill. */

export const CRAFT_LESSONS = `## Craft lessons from the best explainer videos (apply to any topic)

Distilled from studying how the best explainer creators actually build. The story/design/rigor patterns are subject-independent — math, physics, biology, CS, finance, or a general topic — adapt the specifics but keep the shape. The code patterns are ManimCE; reach for them by default.

### Pedagogy — earn every abstraction
- Concrete before formal. Open each concept on something the viewer already owns — a concrete example, a picture, a familiar case — and derive the abstraction from it. Put the equation/definition/dense diagram on screen only once the intuition is there, then build it up one part at a time (reveal or highlight a single term/piece per beat). Never dump a whole formula or busy diagram at once.
- Find this topic's canonical visual model — the one representation the whole video can live in and keep returning to: a geometric picture for math, a labeled process/pathway for biology, flows and charts for finance, a data structure for algorithms, a force/field diagram for physics, a timeline or map for a general topic. Establish it early.
- One idea per beat, ordered so the beats read as an argument; motivate each new step by the limitation of the one before it.
- Convey scale and stakes viscerally, not by assertion — count it out, compare it to something familiar, or show the naive approach visibly failing before the clever one.

### Storytelling
- Frame the whole video around one question or tension and keep answering it.
- For any multi-stage process, lay the whole thing out once as a map, then walk or zoom through each part so the viewer never loses the big picture.
- Withhold the payoff: let the visual build so the "aha" lands as a reveal, not a stated fact. Use callbacks — reintroduce an earlier object or idea at the climax.

### Design carries meaning
- Color is a type system. Fix a small palette where each color means exactly one thing (one concept = one color) and hold it for the entire video; make a label or symbol the same color as the object it names. Keep a consistent visual grammar — the same kind of thing always looks the same. Reserve ONE accent color (e.g. YELLOW) for "what's changing right now".
- Set style once as named constants and reference them everywhere; never inline a hex or font. A house-style convention that reads well: stroke = the bright color, fill = a darker variant of it. Use one family for prose and a monospace-feel for data/numbers if the topic has data.
    PURPLE, PURPLE_DARK = "#8c4dfb", "#3b0893"
    ROLE = {"input": PINK, "hidden": GREEN, "output": BLUE}   # reuse this dict for every related object
    box = RoundedRectangle(...).set_stroke(PURPLE, 3).set_fill(PURPLE_DARK, 1)

### Reusable components & structure — build once, compose from them
- Write get_* factory helpers that return fully-built, parameterized VGroups (a labeled box, a grid, a node, a bar) instead of rebuilding geometry inline every time — this is what keeps a long build DRY and visually consistent. animus renders ONE VoiceoverScene, so these are module-level functions or methods on that scene (not many Scene subclasses).
- Separate a pure-Python data/compute layer from rendering: compute the real values first (plain functions over numpy/lists), then a render helper turns that data into mobjects. Keeps the visual honest and the code repairable.
- Build a custom Mobject (subclass VGroup) when one object recurs with internal structure — put geometry in __init__ and expose domain methods, so structure and view can't drift.

### Concrete techniques — reach for these (ManimCE)
- One ValueTracker, many updaters — a single source of truth that cascades to everything derived from it:
    t = ValueTracker(0)
    dot.add_updater(lambda m: m.move_to(axes.c2p(t.get_value(), f(t.get_value()))))
    bar.add_updater(lambda m: m.set_width(max(t.get_value(), 1e-3), about_edge=LEFT, stretch=True))
    self.play(t.animate.set_value(5), run_time=tracker.duration)
  Map the abstract quantity to a visible property (a length, position, angle) so number and picture move together. self.add the updated mobjects; call m.clear_updaters() before you Transform them.
- Show lineage — make B visibly come from A: self.play(TransformFromCopy(source, target)). For a formula turning into its successor: self.play(TransformMatchingTex(eq1, eq2)) (matching parts glide, the rest fade) — far better than writing new text over old.
- Staggered entrance instead of everything at once: self.play(LaggedStart(*[FadeIn(x) for x in group], lag_ratio=0.1)) or LaggedStartMap(GrowFromCenter, group, lag_ratio=0.1).
- Animate the claim, not just the object: the transition itself should express the idea (one thing becoming another, a value flowing in, a structure assembling). Cut motion that is merely decorative.
- Edit data in place: rebuild from the new data and become() it — self.play(grid.animate.become(get_grid(new_array))).
- Non-destructive emphasis ("look here"): self.play(Circumscribe(m, color=YELLOW)) or Indicate(m). For a soft glow halo, stack fading outlines:
    def glow(m, color=YELLOW, n=16):
        return VGroup(*[SurroundingRectangle(m, color=color, buff=0.03 * i).set_stroke(width=2, opacity=0.5 * (1 - i / n)) for i in range(n)])
- Index-addressable formulas (any topic with equations): author the LaTeX in isolatable pieces so each part is individually colorable/animatable —
    eq = MathTex("x", "=", "{a", "\\over", "b}")   # each argument is eq[i]
    eq.set_color_by_tex("a", GREEN)
  or MathTex(r"...", substrings_to_isolate=["x", "y"]) then eq.get_part_by_tex("x"). How you split the LaTeX determines your index map — a merged \\frac{a}{b} is one unit, {a \\over b} splits.
- Represent a big set legibly by showing a subset with a gap marker and labeling the true size — e.g. draw 8 of N items, put a MathTex(r"\\vdots") between the halves, and Brace(col, LEFT).get_tex("784") for the real count. Applies to any large collection (neurons, rows, data points).
- Motion trail for sequential steps: drop decaying ghost copies — for i, p in enumerate(history): self.add(mob.copy().move_to(p).set_opacity(0.5 / (i + 1))).
- Camera as narrator: subclass both VoiceoverScene and MovingCameraScene (class Video(VoiceoverScene, MovingCameraScene)) and zoom into the part under discussion —
    self.camera.frame.save_state()
    self.play(self.camera.frame.animate.set(width=m.width * 1.4).move_to(m))
    ...
    self.play(Restore(self.camera.frame))
  Keep reasoning in 2D; only go 3D (ThreeDScene) when the idea is genuinely spatial, and tilt the camera to witness the lift rather than cutting.

### Rigor — compute, don't fake (core to animus)
- When the video shows the result of a process — an algorithm, a simulation, a calculation, or real-world data — actually compute it in Python and animate the true values. Do not hand-author plausible-looking numbers, and do not draw a result you didn't derive. Only animate a step the real computation actually took (e.g. show a swap only when the real optimizer improved). Derive every on-screen quantity from the same source so nothing on screen can contradict itself. A faked number is a defect, exactly like an unverified fact.`;
