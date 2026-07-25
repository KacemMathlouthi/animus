/** Estimate the number of characters ElevenLabs synthesizes for a rendered
 * scene, by summing the narration text passed to manim-voiceover's
 * `self.voiceover(...)` calls in the scene source. Both the keyword form
 * (`voiceover(text="...")`) and the positional form (`voiceover("...")`) are
 * counted, since the first positional argument of manim-voiceover's
 * `voiceover()` is the narration text.
 *
 * This is a v1 approximation of TTS usage: it counts the narration in the
 * rendered file, which slightly over-counts on re-renders (manim-voiceover
 * caches unchanged lines and does not re-synthesize them). It also cannot see
 * narration passed as a variable or built at runtime (`voiceover(text=script)`)
 * — only string literals in the source are measured; an exact accounting would
 * diff manim-voiceover's on-disk cache, a deliberate fast-follow. The parser is
 * intentionally forgiving — if it recognizes nothing, it returns 0 (we would
 * rather under-charge than over-charge on an unparseable scene). */

/** Matches a `voiceover(<string literal>` call — with or without the `text=`
 * keyword — allowing an optional f/r/b prefix and single, double, or triple
 * quotes. The opening quote is captured so the matching close can be found. */
const VOICEOVER_CALL =
  /voiceover\s*\(\s*(?:text\s*=\s*)?([a-zA-Z]{0,2})("""|'''|"|')/g;

/** Length of the narration string starting just after its opening quote at
 * `bodyStart`, or null if the closing quote is never found (malformed source).
 * Honors backslash escaping so an escaped quote does not end the string. */
function narrationLength(
  source: string,
  bodyStart: number,
  quote: string
): number | null {
  let i = bodyStart;
  let length = 0;
  while (i < source.length) {
    if (source[i] === "\\" && i + 1 < source.length) {
      // An escape sequence contributes one character to the spoken text.
      length += 1;
      i += 2;
      continue;
    }
    if (source.startsWith(quote, i)) {
      return length;
    }
    length += 1;
    i += 1;
  }
  return null;
}

/** Total narration characters across every `voiceover(text=...)` in the source. */
export function extractNarrationChars(source: string): number {
  let total = 0;
  VOICEOVER_CALL.lastIndex = 0;
  let match = VOICEOVER_CALL.exec(source);
  while (match !== null) {
    const quote = match[2];
    if (quote) {
      const bodyStart = match.index + match[0].length;
      const length = narrationLength(source, bodyStart, quote);
      if (length !== null) {
        total += length;
      }
    }
    match = VOICEOVER_CALL.exec(source);
  }
  return total;
}
