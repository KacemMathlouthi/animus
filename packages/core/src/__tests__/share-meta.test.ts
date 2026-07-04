import { describe, expect, it } from "vitest";
import {
  buildShareMetaTags,
  injectShareMeta,
  SHARE_META_END,
  SHARE_META_START,
  type ShareMetaInput,
} from "../share-meta.ts";

const BASE: ShareMetaInput = {
  title: "Fourier Series",
  description: "A narrated explainer.",
  pageUrl: "https://x.test/v/tok",
  imageUrl: "https://x.test/api/share/tok/og.png",
};

describe("buildShareMetaTags", () => {
  it("emits an image summary card when no video is supplied", () => {
    const tags = buildShareMetaTags(BASE);
    expect(tags).toContain('property="og:type" content="website"');
    expect(tags).toContain('name="twitter:card" content="summary_large_image"');
    expect(tags).toContain(`property="og:image" content="${BASE.imageUrl}"`);
    expect(tags).not.toContain("og:video");
    expect(tags).toContain("<title>Fourier Series · animus</title>");
  });

  it("emits an inline player card when a video + embed are supplied", () => {
    const tags = buildShareMetaTags({
      ...BASE,
      videoUrl: "https://x.test/api/share/tok/video.mp4",
      embedUrl: "https://x.test/api/share/tok/embed",
    });
    expect(tags).toContain('property="og:type" content="video.other"');
    expect(tags).toContain(
      'property="og:video" content="https://x.test/api/share/tok/video.mp4"'
    );
    expect(tags).toContain(
      'property="og:video:secure_url" content="https://x.test/api/share/tok/video.mp4"'
    );
    expect(tags).toContain('name="twitter:card" content="player"');
    expect(tags).toContain(
      'name="twitter:player" content="https://x.test/api/share/tok/embed"'
    );
  });

  it("escapes HTML-significant characters in the title", () => {
    const tags = buildShareMetaTags({
      ...BASE,
      title: `A & B <script> "x"`,
    });
    expect(tags).not.toContain("<script>");
    expect(tags).toContain("A &amp; B &lt;script&gt;");
    expect(tags).toContain("&quot;x&quot;");
  });
});

describe("injectShareMeta", () => {
  const html = `<head>\n<meta charset="utf-8"/>\n${SHARE_META_START}\n<title>default</title>\n${SHARE_META_END}\n</head>`;

  it("replaces the marked region with the new meta block", () => {
    const out = injectShareMeta(html, "<title>injected</title>");
    expect(out).toContain("<title>injected</title>");
    expect(out).not.toContain("<title>default</title>");
    // Charset outside the region is preserved.
    expect(out).toContain('<meta charset="utf-8"/>');
  });

  it("is a no-op when markers are absent", () => {
    const plain = "<head><title>x</title></head>";
    expect(injectShareMeta(plain, "<title>y</title>")).toBe(plain);
  });
});
