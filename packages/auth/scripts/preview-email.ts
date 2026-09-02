/** Renders the magic-link email to a self-contained HTML file you can open
 * straight from disk: the art and the logo are inlined as data URIs, because
 * the real email pulls one from WEB_ORIGIN and the other from a cid: attachment
 * and neither resolves in a bare browser tab. Pass --send to post the real one. */

import { readFile, writeFile } from "node:fs/promises";
import {
  deliverMagicLink,
  renderMagicLinkHtml,
  renderMagicLinkText,
} from "../src/email.ts";

const SAMPLE_URL =
  "https://tryanimus.app/auth/verify?token=preview_token_0123456789abcdef&callbackURL=%2Fstudio";

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

async function dataUri(path: string, mime: string): Promise<string> {
  const bytes = await readFile(new URL(path, import.meta.url));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

const out = argValue("out") ?? "email-preview.html";
const recipient = argValue("send");

const html = renderMagicLinkHtml(SAMPLE_URL)
  .replaceAll(
    /https?:\/\/[^"')]*\/email\/auth-bg\.jpg[^"')]*/g,
    await dataUri("../../../apps/web/public/email/auth-bg.jpg", "image/jpeg")
  )
  .replaceAll("cid:logo", await dataUri("../src/assets/logo.png", "image/png"));

await writeFile(out, html, "utf8");
console.log(`HTML  ${out}  (open it in a browser)`);
console.log(`TEXT  ---\n${renderMagicLinkText(SAMPLE_URL)}\n---`);

if (recipient) {
  await deliverMagicLink({ email: recipient, url: SAMPLE_URL });
  console.log(`Sent  ${recipient} (art loads only if WEB_ORIGIN is public)`);
}
