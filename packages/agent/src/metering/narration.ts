/** Approximates TTS usage by summing the string literals in the scene's
 * `voiceover(...)` calls. Over-counts re-renders (manim-voiceover caches
 * unchanged lines) and misses narration built at runtime. Returns 0 on anything
 * it cannot parse: under-charging beats over-charging. */

/** Handles the `text=` keyword or the positional form, an optional f/r/b
 * prefix, and single, double or triple quotes. */
const VOICEOVER_CALL =
  /voiceover\s*\(\s*(?:text\s*=\s*)?([a-zA-Z]{0,2})("""|'''|"|')/g;

/** Null when the closing quote is never found. Honors backslash escaping so an
 * escaped quote does not end the string. */
function narrationLength(
  source: string,
  bodyStart: number,
  quote: string
): number | null {
  let i = bodyStart;
  let length = 0;
  while (i < source.length) {
    if (source[i] === "\\" && i + 1 < source.length) {
      // An escape sequence is one spoken character.
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
