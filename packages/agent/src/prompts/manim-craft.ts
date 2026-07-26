/** Always-on Manim craft rules — the every-render core synthesized from the
 * bundled manim-video skill, rewritten for animus's flow (one narrated
 * VoiceoverScene rendered once via renderScene). Long-tail references stay in
 * the sandbox for on-demand reading; this core lives in the system prompt rather
 * than behind a tool the model might not consult. */

export const MANIM_CRAFT = `## Visual craft — apply on every render; this is what makes a video look finished instead of broken

This is educational cinema: every frame should teach. Before coding, decide the visual story — what each section builds toward and what the key "aha" is. Show the picture before the formalism: the diagram, process or concrete case first, the equation or definition second, so the abstraction feels earned. This holds whatever the subject — a pathway in biology, a flow in finance, a data structure in CS, a force diagram in physics.

IMPORTANT: a full Manim craft skill is bundled in the sandbox at /home/daytona/skill — it goes far deeper than this summary, and it is your authoritative reference. Consult it ACTIVELY with readFile (see "Required reading" at the end); do not build scenes from memory alone. The rules below are the always-apply core; the skill is the detail.

Frame & layout — the #1 cause of broken-looking output is content off-screen or overlapping. The visible frame is about 14.2 wide x 8.0 tall. Stay inside a safe area:
- Usable: x in [-6.5, 6.5], y in [-3.5, 3.5]. Title zone y in [2.5, 3.5]; bottom-note zone y in [-3.5, -2.5]; main content y in [-2.5, 2.5], x in [-6.0, 6.0].
- Size and place relative to config.frame_width / config.frame_height; never hard-code coordinates that assume a larger frame.
- Clamp anything that might be wide: if m.width > config.frame_width - 1.0, call m.set_width(config.frame_width - 1.0) (use set_height for tall content).
- Position with layout helpers, not eyeballed coordinates: VGroup(...).arrange(DOWN, buff=0.5), next_to(other, RIGHT, buff=0.5), to_edge(UP, buff=0.5). Keep buff >= 0.5 near edges so text never clips.
- Fill the frame without crowding it: aim to leave ~15% empty. A lone small object looks unfinished (add a dim title, axes, or citation); a packed frame is unreadable.
- Center the active group. The mobjects for the current beat should sit roughly centered, not clustered against one side with a dead empty half. Position RELATIVE to other mobjects and the frame (next_to / arrange / to_edge / move_to(ORIGIN)) rather than hardcoded absolute coordinates — magic coordinates like RIGHT*2 are the main cause of overlap and lopsided frames. If a beat ends up off-balance, wrap it in a VGroup and move_to(ORIGIN).
- Never let a filled shape cover a text label — this is a top cause of broken-looking output (a virus circle painting over its own "Pathogen" label). Put labels OUTSIDE their shape with next_to(shape, DOWN/UP, buff>=0.3). If a label must sit on a filled mobject, add it AFTER the fill (or set_z_index higher) so it renders on top, and make sure it contrasts. When shapes move toward each other (cells converging on a pathogen, etc.), keep enough separation that one body never hides another's label.

Contrast — on the black background, every label and important stroke must be light and saturated enough to read:
- Do NOT use dark greys (e.g. "#4A5568" slate) for text or key outlines — they vanish on black. Use light neutrals (GREY_B/GREY_A/WHITE) or a saturated hue.
- A label over a colored fill must contrast with that fill (light text on a dark fill, dark text on a light fill). A dim fill (fill_opacity ~0.3) in the same hue as its label will swallow the text — brighten the label or lower the fill opacity.

Element budget & cleanup — keep at most ~6 things visible at once, or the viewer can't track it. When a section is done, clear its space before the next one:
- FadeOut what is finished, e.g. self.play(FadeOut(Group(*self.mobjects))), before reusing the same area. Use Group (not VGroup) when any Text() is included, or it raises a TypeError.
- Replace in place with ReplacementTransform(old, new) — never Write() new text over existing text; that is the overlap to avoid.

Pacing — rushed, too-short videos come from missing pauses. Put self.wait() after every reveal so the eye can land. Rough budget:
- Title appear ~1.5s then wait ~1.0s; key reveal/equation ~2.0s then ~2.0s; transform ~1.5s then ~1.5s; small label ~0.8s then ~0.5s; "aha" moment ~2.5s then ~3.0s; FadeOut ~0.5s then ~0.3s.
- Shape the whole video slow -> medium -> fast (climax) -> slow (conclusion). A 2s pause after the key moment is never wasted.

Background — keep Manim's default (black). Do NOT set self.camera.background_color; a dark-grey canvas makes the output look off.

Typography — use a clean serif for all on-screen text. Define FONT = "DejaVu Serif" once and pass font=FONT to every Text(...). Do NOT use "Latin Modern Roman" for Text(): it is a multi-optical-size LaTeX family and Manim's Text()/Pango renders it with erratic, uneven letter and word spacing (words visibly break apart — "Immunity" comes out mangled). "DejaVu Serif" is a single-master font that renders evenly and is installed here. Also do NOT use "Menlo" or other macOS fonts — they are not installed and silently fall back to an ugly default. Sizes: titles ~48, body ~30, labels ~24, never below font_size=18. For typeset MATH only, use MathTex/Tex with raw strings, e.g. MathTex(r"\\frac{1}{2}") — those go through LaTeX (not Pango) so they render Latin Modern correctly; never route plain prose/labels through Tex just for the font.

Required reading — the bundled skill at /home/daytona/skill/references/ goes well beyond this summary. Consulting it is not optional; a scene built from memory alone will miss these rules and look broken. Use readFile proactively, not as a last resort:
- At the START of every video, read scene-planning.md, production-quality.md, and visual-design.md — they cover layout, spacing, frame-safety, element budget and pacing in full.
- Before using any specialized construct, open its reference FIRST: equations.md (Tex/MathTex, derivations), graphs-and-data.md (axes, charts, algorithm viz), camera-and-3d.md (3D, moving camera), updaters-and-trackers.md (ValueTracker, always_redraw), decorations.md (braces, arrows, SurroundingRectangle), mobjects.md (text/shapes/positioning), animations.md (rate functions, composition), troubleshooting.md (whenever a render errors).
- These are technique references: apply their Manim code, but IGNORE any workflow that conflicts with animus — we render ONE narrated VoiceoverScene ONCE via renderScene: no per-scene files and no ffmpeg stitching. Narration IS used (manim-voiceover); background music is mixed in by animus after rendering, so don't add it in the scene.`;
