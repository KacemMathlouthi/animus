import { describe, expect, it } from "vitest";
import { extractNarrationChars } from "../narration.ts";

describe("extractNarrationChars", () => {
  it("counts a single double-quoted narration", () => {
    const source = `with self.voiceover(text="Hello world") as tracker:`;
    expect(extractNarrationChars(source)).toBe("Hello world".length);
  });

  it("sums multiple voiceover calls", () => {
    const source = `
      with self.voiceover(text="First line") as t1:
          self.play(Write(a))
      with self.voiceover(text='Second') as t2:
          self.play(Write(b))
    `;
    expect(extractNarrationChars(source)).toBe(
      "First line".length + "Second".length
    );
  });

  it("handles triple-quoted narration", () => {
    const narration = "A longer\nmulti-line narration.";
    const source = `with self.voiceover(text="""${narration}""") as tracker:`;
    expect(extractNarrationChars(source)).toBe(narration.length);
  });

  it("counts escaped quotes as one character and does not end the string early", () => {
    // Spoken text: She said "hi" — the \" escapes contribute one char each.
    const source = 'self.voiceover(text="She said \\"hi\\"")';
    expect(extractNarrationChars(source)).toBe('She said "hi"'.length);
  });

  it("tolerates whitespace around the call and the keyword", () => {
    const source = `self.voiceover (  text =  'spaced' )`;
    expect(extractNarrationChars(source)).toBe("spaced".length);
  });

  it("handles an f-string prefix", () => {
    const source = `self.voiceover(text=f"value is {x}")`;
    expect(extractNarrationChars(source)).toBe("value is {x}".length);
  });

  it("returns 0 for a scene with no narration", () => {
    const source =
      "class Foo(Scene):\n    def construct(self):\n        self.play(Write(t))";
    expect(extractNarrationChars(source)).toBe(0);
  });

  it("ignores an unterminated string (malformed source)", () => {
    const source = `self.voiceover(text="never closed`;
    expect(extractNarrationChars(source)).toBe(0);
  });

  it("is stable across repeated calls (no shared regex state)", () => {
    const source = `self.voiceover(text="abc")`;
    expect(extractNarrationChars(source)).toBe(3);
    expect(extractNarrationChars(source)).toBe(3);
  });
});
