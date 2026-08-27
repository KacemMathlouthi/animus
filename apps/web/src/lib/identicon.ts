/** Hard-edged blocks on a square grid, mirrored vertically. One tone on the
 * brand hue, so a wall of avatars reads as one palette and shape is what tells
 * people apart. Pure and DOM-free; `UserAvatar` draws the SVG.
 *
 * FNV-1a with a Murmur3 finalizer — stable well-distributed bits, not a digest.
 * Nothing here is a secret. */

// biome-ignore-all lint/suspicious/noBitwiseOperators: a 32-bit hash is bit
// manipulation by definition; the shifts and masks here are the algorithm.

/** Blocks per side; everything below derives from it. */
export const GRID = 7;
/** Only the left half is generated. On an odd grid the extra column is the
 * centre spine and is not mirrored. */
const HALF_COLUMNS = Math.ceil(GRID / 2);
const MIRRORED_COLUMNS = GRID - HALF_COLUMNS;
/** Bit stride per cell, so no two share a bit. Small enough that
 * `HALF_COLUMNS * BIT_STRIDE` stays inside a 32-bit word. */
const BIT_STRIDE = 3;

const FNV_OFFSET = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

/** The oklch hue of `--primary`, so the marks read as brand colour. */
const BRAND_HUE = 74;
/** Half-width of the hue jitter. Narrow on purpose: enough to separate two
 * marks, not enough to leave the brand hue. */
const HUE_SPREAD = 10;
const HUE_STEPS = HUE_SPREAD * 2 + 1;

/** Murmur3's finalizer. FNV-1a's low bits are near-parity of the input, which
 * visibly biases the grid towards blank cells; this avalanches the word first. */
function avalanche(value: number): number {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x85_eb_ca_6b) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2_b2_ae_35) >>> 0;
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

/** 32-bit FNV-1a over the seed, offset so one seed can yield several streams. */
function hash(seed: string, salt: number): number {
  let value = (FNV_OFFSET ^ salt) >>> 0;
  for (let i = 0; i < seed.length; i++) {
    value = Math.imul(value ^ seed.charCodeAt(i), FNV_PRIME) >>> 0;
  }
  return avalanche(value);
}

interface Identicon {
  /** Row-major `[row][column]`, `GRID` x `GRID`, `true` where a block is drawn. */
  cells: boolean[][];
  /** 0–359: a narrow jitter around the brand hue. */
  hue: number;
}

/** Build the mirrored grid and hue for a seed. Deterministic. */
export function identiconFrom(seed: string): Identicon {
  const tint = hash(seed, 0);
  const cells: boolean[][] = [];

  for (let row = 0; row < GRID; row++) {
    const rowBits = hash(seed, row + 1);
    const half: boolean[] = [];
    for (let column = 0; column < HALF_COLUMNS; column++) {
      half.push(((rowBits >>> (column * BIT_STRIDE)) & 1) === 1);
    }
    cells.push([...half, ...half.slice(0, MIRRORED_COLUMNS).reverse()]);
  }

  const hue = (BRAND_HUE + ((tint % HUE_STEPS) - HUE_SPREAD) + 360) % 360;
  return { cells, hue };
}
