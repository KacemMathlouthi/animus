/** Outside production a missing key or failed send prints the link so local dev
 * is never blocked. In production it never prints and always throws: a magic
 * link is a working credential, and a log drain would hand out sign-ins. */

import { readFile } from "node:fs/promises";
import { getServerEnv } from "@animus/core/env";
import { Resend } from "resend";

const env = getServerEnv();
const isProduction = env.nodeEnv === "production";
const from = env.resendFrom;
const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

const FONT_STACK =
  "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const LOGO_IMG =
  '<img src="cid:logo" width="36" height="48" alt="animus" style="display:block;margin:0 auto;border:0;outline:none;" />';

const CORNER_ROW = `<tr>
              <td style="padding:10px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td align="left" style="font-family:monospace;font-size:13px;color:#ccc9c3;line-height:1;">+</td>
                  <td align="right" style="font-family:monospace;font-size:13px;color:#ccc9c3;line-height:1;">+</td>
                </tr></table>
              </td>
            </tr>`;

let logoBytes: Buffer | null = null;
async function logoContent(): Promise<Buffer> {
  if (!logoBytes) {
    logoBytes = await readFile(new URL("./assets/logo.png", import.meta.url));
  }
  return logoBytes;
}

function renderHtml(url: string): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#faf9f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="400" style="width:400px;max-width:400px;background:#ffffff;border:1px solid #e6e4e0;font-family:${FONT_STACK};">
            ${CORNER_ROW}
            <tr>
              <td align="center" style="padding:8px 36px 0;">
                ${LOGO_IMG}
                <div style="font-size:22px;font-weight:600;color:#0c0c0c;letter-spacing:-0.01em;margin-top:12px;">animus</div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:26px 36px 0;font-size:19px;font-weight:600;color:#0c0c0c;letter-spacing:-0.01em;">
                Sign in to animus
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:8px 36px 0;font-size:15px;line-height:1.6;color:#71716c;">
                Click below to securely sign in. This link works once and expires in 5 minutes.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:26px 36px;">
                <a href="${url}" style="display:inline-block;background:#4a3212;color:#fbfdf6;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:10px;">
                  Sign in
                </a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 36px;font-size:12px;color:#a1a19b;">
                or paste this link into your browser
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:6px 36px 26px;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${url}" style="color:#4a3212;text-decoration:underline;">${url}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 36px;">
                <div style="border-top:1px solid #efeee9;"></div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 36px;font-size:12px;line-height:1.6;color:#a1a19b;">
                If you didn't request this, you can safely ignore this email.
              </td>
            </tr>
            ${CORNER_ROW}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderText(url: string): string {
  return `Sign in to animus

Open this link to sign in (works once, expires in 5 minutes):
${url}

If you didn't request this, you can safely ignore this email.`;
}

/** Points at a page in the web app, not the API's verify endpoint: mail
 * scanners prefetch every link, and verify spends its single-use token on GET,
 * so a direct link arrives already invalid. Scanners do not click buttons. */
export function magicLinkPageUrl({
  webOrigin,
  token,
  callbackURL,
}: {
  webOrigin: string;
  token: string;
  callbackURL: string;
}): string {
  const url = new URL("/auth/verify", webOrigin);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackURL);
  return url.toString();
}

export async function deliverMagicLink({
  email,
  url,
}: {
  email: string;
  url: string;
}): Promise<void> {
  if (!resend) {
    if (isProduction) {
      // The env gate requires the key in prod, so this means it was bypassed.
      throw new Error("RESEND_API_KEY is not set; cannot send the magic link");
    }
    console.log(`Magic link for ${email}: ${url}`);
    return;
  }

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: "Your animus sign-in link",
    html: renderHtml(url),
    text: renderText(url),
    attachments: [
      {
        filename: "logo.png",
        content: await logoContent(),
        contentType: "image/png",
        contentId: "logo",
      },
    ],
  });

  if (error) {
    if (isProduction) {
      // Lets Better Auth surface a real failure rather than "check your email".
      throw new Error(`Failed to send the magic link: ${error.message}`);
    }
    console.error("Failed to send magic link via Resend:", error);
    // Keep local dev unblocked.
    console.log(`Magic link for ${email}: ${url}`);
  }
}
