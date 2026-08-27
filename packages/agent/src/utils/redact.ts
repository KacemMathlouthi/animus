/** Strips known secrets out of anything the sandbox echoes back.
 *
 * Read this before relying on it: redaction is a speed bump, not a boundary.
 * The user writes the prompt, so there is no malicious-instruction to detect —
 * they can simply ask. And a secret can leave the sandbox without ever passing
 * through here: `curl` to their own server, an outbound DNS lookup, writing it
 * into the rendered video. The real fix is for the sandbox never to hold the
 * key (a credential-injecting egress proxy); this only raises the cost of the
 * laziest attempt.
 *
 * What it does do is defeat fragmenting, which is the obvious first bypass:
 * `echo ${KEY:0:10}` and `echo ${KEY:10}` both leak runs that are still long
 * enough to be uniquely the key. So instead of matching the secret whole, this
 * matches any run of MIN_FRAGMENT or more of its characters, and collapses
 * adjacent runs into a single marker. */

const MARKER = "[redacted]";

/** Shortest run of a secret that gets redacted. Eight characters of a random
 * key is ~48 bits — it cannot collide with ordinary log text by accident, and
 * it is short enough that reassembling the key from what survives is not
 * meaningfully easier than guessing it. */
const MIN_FRAGMENT = 8;

/** Below this a "secret" is either a placeholder or short enough that its
 * fragments would match real words. Redacting it would corrupt logs to no end. */
const MIN_SECRET_LENGTH = 16;

/** Scan for the first MIN_FRAGMENT characters that belong to a secret, then
 * extend the match for as long as the run is still a contiguous piece of that
 * secret. Extending matters: a fixed-width match consumes in multiples of
 * MIN_FRAGMENT and leaves the key's last few characters sitting in the output. */
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

/** Every MIN_FRAGMENT-long window of every usable secret — the seeds the scan
 * looks for. */
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

/** A redactor bound to this turn's secrets. Returns the identity function when
 * there is nothing worth redacting, so callers need no special case. */
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
