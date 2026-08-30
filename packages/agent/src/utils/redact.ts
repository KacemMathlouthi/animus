/** Strips known secrets from anything the sandbox echoes back. A speed bump,
 * not a boundary: the user writes the prompt and can still `curl` the key out.
 * Matching runs rather than whole strings is what defeats the obvious bypass of
 * echoing the key in pieces. The real fix is the sandbox never holding it. */

const MARKER = "[redacted]";

/** Eight characters of a random key is ~48 bits: too long to collide with log
 * text, short enough that what survives is no easier to guess from. */
const MIN_FRAGMENT = 8;

/** Below this a "secret" is a placeholder whose fragments match real words. */
const MIN_SECRET_LENGTH = 16;

/** Extending matters: a fixed-width match consumes in multiples of
 * MIN_FRAGMENT and leaves the key's last few characters in the output. */
function redactWith(
  text: string,
  secrets: string[],
  fragments: Set<string>
): string {
  let out = "";
  let index = 0;
  while (index < text.length) {
    const window = text.slice(index, index + MIN_FRAGMENT);
    if (window.length < MIN_FRAGMENT || !fragments.has(window)) {
      out += text[index];
      index += 1;
      continue;
    }
    let end = index + MIN_FRAGMENT;
    while (
      end < text.length &&
      secrets.some((secret) => secret.includes(text.slice(index, end + 1)))
    ) {
      end += 1;
    }
    out += MARKER;
    index = end;
  }
  return out;
}

/** The seeds the scan looks for. */
function buildFragments(secrets: string[]): Set<string> {
  const fragments = new Set<string>();
  for (const secret of secrets) {
    for (let i = 0; i + MIN_FRAGMENT <= secret.length; i++) {
      fragments.add(secret.slice(i, i + MIN_FRAGMENT));
    }
  }
  return fragments;
}

export type Redactor = (text: string) => string;

/** Returns the identity function when there is nothing worth redacting, so
 * callers need no special case. */
export function createRedactor(secrets: (string | undefined)[]): Redactor {
  const usable = secrets.filter(
    (secret): secret is string =>
      Boolean(secret) && (secret as string).length >= MIN_SECRET_LENGTH
  );
  const fragments = buildFragments(usable);
  if (fragments.size === 0) {
    return (text: string) => text;
  }
  return (text: string) => redactWith(text, usable, fragments);
}
