/** The animus share card — a deterministic, brand-only preview card derived
 * purely from a video's title and a seed. One design, three surfaces: the
 * studio player poster, the public share page, and the Open Graph link-preview.
 */

/** Brand palette. */
const BASE = "#0b0a0a";
const BORDER = "#2a2118";
const AMBER_LIGHT = "#e7b277";
const AMBER_DARK = "#7a4717";
const TEXT = "#f5efe6";
const MUTED = "#9a8f80";

/** Canonical Open Graph dimensions. */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Curated painting set for the card's right half (basenames). The web serves
 * `/features/<name>.webp`; the API embeds `assets/share-images/<name>.jpg`. */
export const SHARE_IMAGES = [
  "research-grounded",
  "narration",
  "precision",
  "share",
] as const;

const WHITESPACE_RUN = /\s+/;
const TRAILING_WHITESPACE = /\s+$/;

/** FNV-1a, a small deterministic string hash. Returns a non-negative integer.
 * Bitwise ops are intrinsic to the algorithm. */
export function hashSeed(seed: string): number {
  let hash = 0x81_1c_9d_c5;
  for (let i = 0; i < seed.length; i++) {
    // biome-ignore lint/suspicious/noBitwiseOperators: FNV-1a mixes with XOR
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  // biome-ignore lint/suspicious/noBitwiseOperators: coerce to an unsigned 32-bit int
  return hash >>> 0;
}

/** Which curated painting a seed maps to (0-based). */
export function shareImageIndex(seed: string): number {
  return hashSeed(seed) % SHARE_IMAGES.length;
}

/** The curated painting basename a seed maps to. */
export function shareImageName(seed: string): string {
  return SHARE_IMAGES[shareImageIndex(seed)] ?? SHARE_IMAGES[0];
}

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};
const XML_UNSAFE = /[&<>"']/g;

function escapeXml(value: string): string {
  return value.replace(XML_UNSAFE, (char) => XML_ESCAPES[char] ?? char);
}

/** Greedy word-wrap by estimated glyph width. Geist SemiBold averages ~0.55em
 * per glyph; we wrap to at most `maxLines`, ellipsizing the final line when the
 * title overflows so a very long title never blows past its column. */
function wrapTitle(
  title: string,
  columnWidth: number,
  fontSize: number,
  maxLines: number
): string[] {
  const maxChars = Math.max(6, Math.floor(columnWidth / (fontSize * 0.55)));
  const words = title.trim().split(WHITESPACE_RUN).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
    if (lines.length === maxLines) {
      break;
    }
  }
  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  const consumed = lines.join(" ").split(WHITESPACE_RUN).filter(Boolean).length;
  const lastIdx = lines.length - 1;
  if (consumed < words.length && lastIdx >= 0) {
    let last = lines[lastIdx] ?? "";
    while (last.length > 1 && last.length + 1 > maxChars) {
      last = last.slice(0, -1);
    }
    lines[lastIdx] = `${last.replace(TRAILING_WHITESPACE, "")}…`;
  }
  return lines;
}

/** Pick a title font size (as a fraction of height) that keeps the title within
 * three lines where possible — shorter titles get to be bigger. */
function fitTitle(
  title: string,
  columnWidth: number,
  height: number
): { fontSize: number; lines: string[] } {
  const smallest = 0.075;
  const scales = [0.12, 0.104, 0.088, smallest];
  for (const scale of scales) {
    const fontSize = height * scale;
    const lines = wrapTitle(title, columnWidth, fontSize, 3);
    if (lines.length <= 3 && !lines.at(-1)?.endsWith("…")) {
      return { fontSize, lines };
    }
  }
  const fontSize = height * smallest;
  return { fontSize, lines: wrapTitle(title, columnWidth, fontSize, 3) };
}

/** The animus logo mark as a `<g>`, scaled to `size` and translated to (x, y).
 * Paths lifted from public/logo.svg (native viewBox is "25 19 70 93"). */
function logoMark(x: number, y: number, size: number, idp: string): string {
  const scale = size / 93;
  return `<g transform="translate(${x} ${y}) scale(${scale}) translate(-25 -19)">
    <path d="M28 64 C28 38 42 22 60 22 C78 22 92 38 92 64 L92 104 C92 111 80 111 76 104 Q68 114 60 104 Q52 114 44 104 C40 111 28 111 28 104 Z" fill="url(#${idp}-logo)"/>
    <g fill="${BASE}" transform="translate(5.2 -11.2) scale(0.6)">
      <path d="m74.6 97.4h0.2c3.2 0 5.6 2.6 5.6 5.8l0.1 17.9c-0.1 3.1-2.4 5.9-5.9 6-2.9-0.1-5.7-2.1-5.7-6.2v-17.9c0-3.1 2.5-5.6 5.7-5.6z"/>
      <path d="m105.4 97.4h0.1c3 0 5.7 2.5 5.7 5.8v17.8c0 3-2.5 6.1-6 6.1-2.8-0.1-5.7-2.3-5.8-6.1v-18c0.2-3.1 2.6-5.6 6-5.6z"/>
    </g>
  </g>`;
}

export interface ShareCardInput {
  height?: number;
  /** Resolved right-half image: a `/features/<name>.webp` URL (web, inline SVG) or
   * a `data:image/jpeg;base64,…` URI (API, rasterized). Pick via `shareImageName`. */
  imageHref: string;
  /** Stable string that salts the gradient ids (e.g. the token or conversation id). */
  seed: string;
  /** The video title, shown large on the left. */
  title: string;
  /** Output canvas size. Defaults to the Open Graph ratio. */
  width?: number;
}

/** Build the share card as a standalone SVG string. */
export function buildShareCardSvg(input: ShareCardInput): string {
  const width = input.width ?? OG_WIDTH;
  const height = input.height ?? OG_HEIGHT;
  const idp = `sc${hashSeed(input.seed).toString(36)}`;
  const split = Math.round(width * 0.5);
  const pad = height * 0.1;
  const leftColWidth = split - pad * 1.5;

  const { fontSize, lines } = fitTitle(input.title, leftColWidth, height);
  const lineHeight = fontSize * 1.14;
  const titleBlockH = lineHeight * lines.length;
  // Sit the title a little above the vertical centre of the left half; the brand
  // line pins to the bottom.
  const titleTop = Math.max(pad, (height - titleBlockH) * 0.42);
  const titleTspans = lines
    .map(
      (line, i) =>
        `<tspan x="${pad}" y="${(titleTop + fontSize + i * lineHeight).toFixed(1)}">${escapeXml(line)}</tspan>`
    )
    .join("");

  const brandY = height - pad;
  const logoSize = height * 0.085;
  const brandTextX = pad + logoSize * 0.78 + width * 0.012;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(input.title)} — made with animus">
  <defs>
    <linearGradient id="${idp}-logo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${AMBER_LIGHT}"/>
      <stop offset="1" stop-color="${AMBER_DARK}"/>
    </linearGradient>
    <linearGradient id="${idp}-seam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${BASE}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${BASE}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="${BASE}"/>

  <image href="${escapeXml(input.imageHref)}" x="${split}" y="0" width="${width - split}" height="${height}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="${split}" y="0" width="${(width - split) * 0.28}" height="${height}" fill="url(#${idp}-seam)"/>
  <rect x="${split - 1}" y="0" width="2" height="${height}" fill="${BORDER}"/>

  <text font-family="Geist, sans-serif" font-weight="600" font-size="${fontSize.toFixed(1)}" fill="${TEXT}" letter-spacing="-0.02em">${titleTspans}</text>

  ${logoMark(pad, brandY - logoSize, logoSize, idp)}
  <text x="${brandTextX.toFixed(1)}" y="${(brandY - logoSize * 0.28).toFixed(1)}" font-family="Geist, sans-serif" font-weight="500" font-size="${(height * 0.034).toFixed(1)}" fill="${MUTED}" letter-spacing="0.01em">Made with animus</text>
</svg>`;
}
