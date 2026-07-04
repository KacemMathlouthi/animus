/** Always-on Manim craft rules — the every-render core synthesized from the
 * bundled manim-video skill, rewritten for animus's flow (one narrated
 * VoiceoverScene rendered once via renderScene). Long-tail references stay in
 * the sandbox for on-demand reading; this core lives in the system prompt rather
 * than behind a tool the model might not consult. */

export const MANIM_CRAFT = `## Visual craft — apply on every render; this is what makes a video look finished instead of broken

This is educational cinema: every frame should teach. Before coding, decide the visual story — what each section builds toward and what the key "aha" is. Show geometry before algebra: the shape first, the equation second, so the formula feels earned.

IMPORTANT: a full Manim craft skill is bundled in the sandbox at /home/daytona/skill — it goes far deeper than this summary, and it is your authoritative reference. Consult it ACTIVELY with readFile (see "Required reading" at the end); do not build scenes from memory alone. The rules below are the always-apply core; the skill is the detail.

Frame & layout — the #1 cause of broken-looking output is content off-screen or overlapping. The visible frame is about 14.2 wide x 8.0 tall. Stay inside a safe area:
- Usable: x in [-6.5, 6.5], y in [-3.5, 3.5]. Title zone y in [2.5, 3.5]; bottom-note zone y in [-3.5, -2.5]; main content y in [-2.5, 2.5], x in [-6.0, 6.0].
- Size and place relative to config.frame_width / config.frame_height; never hard-code coordinates that assume a larger frame.
- Clamp anything that might be wide: if m.width > config.frame_width - 1.0, call m.set_width(config.frame_width - 1.0) (use set_height for tall content).
- Position with layout helpers, not eyeballed coordinates: VGroup(...).arrange(DOWN, buff=0.5), next_to(other, RIGHT, buff=0.5), to_edge(UP, buff=0.5). Keep buff >= 0.5 near edges so text never clips.
- Fill the frame without crowding it: aim to leave ~15% empty. A lone small object looks unfinished (add a dim title, axes, or citation); a packed frame is unreadable.

Element budget & cleanup — keep at most ~6 things visible at once, or the viewer can't track it. When a section is done, clear its space before the next one:
- FadeOut what is finished, e.g. self.play(FadeOut(Group(*self.mobjects))), before reusing the same area. Use Group (not VGroup) when any Text() is included, or it raises a TypeError.
- Replace in place with ReplacementTransform(old, new) — never Write() new text over existing text; that is the overlap to avoid.

Pacing — rushed, too-short videos come from missing pauses. Put self.wait() after every reveal so the eye can land. Rough budget:
- Title appear ~1.5s then wait ~1.0s; key reveal/equation ~2.0s then ~2.0s; transform ~1.5s then ~1.5s; small label ~0.8s then ~0.5s; "aha" moment ~2.5s then ~3.0s; FadeOut ~0.5s then ~0.3s.
- Shape the whole video slow -> medium -> fast (climax) -> slow (conclusion). A 2s pause after the key moment is never wasted.

Background — keep Manim's default (black). Do NOT set self.camera.background_color, and ignore any dark-grey (#1C1C1C / #0D1117) recommendation in the bundled skill; those make the output look off. Let Manim's defaults stand for colors too unless the user asks otherwise.

Typography — use the LaTeX serif for all text. Define FONT = "Latin Modern Roman" once and pass font=FONT to every Text(...); do NOT use "Menlo" or other macOS fonts — they are not installed here and silently fall back to an ugly default. Sizes: titles ~48, body ~30, labels ~24, never below font_size=18. For typeset math use MathTex/Tex with raw strings, e.g. MathTex(r"\\frac{1}{2}") — these already render in the LaTeX font.

Required reading — the bundled skill at /home/daytona/skill/references/ goes well beyond this summary. Consulting it is not optional; a scene built from memory alone will miss these rules and look broken. Use readFile proactively, not as a last resort:
- At the START of every video, read scene-planning.md, production-quality.md, and visual-design.md — they cover layout, spacing, frame-safety, element budget and pacing in full.
- Before using any specialized construct, open its reference FIRST: equations.md (Tex/MathTex, derivations), graphs-and-data.md (axes, charts, algorithm viz), camera-and-3d.md (3D, moving camera), updaters-and-trackers.md (ValueTracker, always_redraw), decorations.md (braces, arrows, SurroundingRectangle), mobjects.md (text/shapes/positioning), animations.md (rate functions, composition), troubleshooting.md (whenever a render errors).
- These are technique references: apply their Manim code, but IGNORE any workflow that conflicts with animus — we render ONE narrated VoiceoverScene ONCE via renderScene: no per-scene files and no ffmpeg stitching. Narration IS used (manim-voiceover); background music is mixed in by animus after rendering, so don't add it in the scene.`;
