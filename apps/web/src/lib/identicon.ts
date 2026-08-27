/** Mirrored blocks on one brand hue, so a wall of avatars reads as one palette
 * and shape is what tells people apart. Pure; `UserAvatar` draws the SVG.
 * FNV-1a plus a Murmur3 finalizer: well-distributed bits, not a digest. */

// biome-ignore-all lint/suspicious/noBitwiseOperators: a 32-bit hash is bit
// manipulation by definition; the shifts and masks here are the algorithm.

export const GRID = 7;
/** On an odd grid the extra column is the centre spine, not mirrored. */
const HALF_COLUMNS = Math.ceil(GRID / 2);
const MIRRORED_COLUMNS = GRID - HALF_COLUMNS;
/** Small enough that `HALF_COLUMNS * BIT_STRIDE` stays in a 32-bit word. */
const BIT_STRIDE = 3;

const FNV_OFFSET = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;

const BRAND_HUE = 74;
/** Narrow: enough to separate two marks, not enough to leave the hue. */
const HUE_SPREAD = 10;
const HUE_STEPS = HUE_SPREAD * 2 + 1;

/** FNV-1a's low bits are near-parity of the input, which visibly biases the
 * grid towards blank cells. This avalanches the word first. */
function avalanche(value: number): number {
  let mixed = value >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x85_eb_ca_6b) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 13), 0xc2_b2_ae_35) >>> 0;
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

/** Offset so one seed can yield several streams. */
function hash(seed: string, salt: number): number {
  let value = (FNV_OFFSET ^ salt) >>> 0;
  for (let i = 0; i < seed.length; i++) {
    value = Math.imul(value ^ seed.charCodeAt(i), FNV_PRIME) >>> 0;
  }
  return avalanche(value);
}

interface Identicon {
  /** Row-major, `true` where a block is drawn. */
  cells: boolean[][];
  hue: number;
}

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
