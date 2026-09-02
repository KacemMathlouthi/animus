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

const PANEL_WIDTH = 448;
/** The inset that leaves the art showing as a frame around the content card. */
const PANEL_INSET = 48;
const CARD_WIDTH = PANEL_WIDTH - 2 * PANEL_INSET;

const PAGE = "#faf9f7";
/** Shows through wherever the art does not: Outlook desktop drops background
 * images outright, and any client may block them. A dark frame either way. */
const FRAME_INK = "#0a0806";
const CARD = "#ffffff";
const CARD_BORDER = "#e6e4e0";
const INK = "#0c0c0c";
const MUTED = "#71716c";
const MUTED_DIM = "#a1a19b";
const CORNER = "#ccc9c3";
const RULE = "#efeee9";
const ACCENT = "#4a3212";
const ACCENT_TEXT = "#fbfdf6";

/** Served from the web app, not attached: no mail client will use an inline
 * attachment as a CSS background. Bump ?v when the art changes — Gmail's image
 * proxy caches by URL indefinitely. */
const backgroundUrl = `${env.webOrigin.replace(/\/$/, "")}/email/auth-bg.jpg?v=1`;

const LOGO_IMG =
  '<img src="cid:logo" width="36" height="48" alt="animus" style="display:block;margin:0 auto;border:0;outline:none;" />';

function cornerRow(color: string): string {
  return `<tr>
              <td style="padding:10px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td align="left" style="font-family:monospace;font-size:13px;color:${color};line-height:1;">+</td>
                  <td align="right" style="font-family:monospace;font-size:13px;color:${color};line-height:1;">+</td>
                </tr></table>
              </td>
            </tr>`;
}

let logoBytes: Buffer | null = null;
async function logoContent(): Promise<Buffer> {
  if (!logoBytes) {
    logoBytes = await readFile(new URL("./assets/logo.png", import.meta.url));
  }
  return logoBytes;
}

/** The line clients show next to the subject. Without one they scrape the
 * first body text, which here is the hidden alt of the logo. */
const PREHEADER =
  "Your sign-in link is ready. It works once and expires in 5 minutes.";

export function renderMagicLinkHtml(url: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Sign in to animus</title>
  </head>
  <body style="margin:0;padding:0;background:${PAGE};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${PREHEADER}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="${PANEL_WIDTH}" style="width:${PANEL_WIDTH}px;max-width:${PANEL_WIDTH}px;">
            <tr>
              <td align="center" background="${backgroundUrl}" bgcolor="${FRAME_INK}" style="padding:${PANEL_INSET}px;background-color:${FRAME_INK};background-image:url('${backgroundUrl}');background-repeat:no-repeat;background-position:center;background-size:cover;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="${CARD_WIDTH}" style="width:${CARD_WIDTH}px;max-width:${CARD_WIDTH}px;background:${CARD};border:1px solid ${CARD_BORDER};font-family:${FONT_STACK};">
                  ${cornerRow(CORNER)}
                  <tr>
                    <td align="center" style="padding:8px 28px 0;">
                      ${LOGO_IMG}
                      <div style="font-size:22px;font-weight:600;color:${INK};letter-spacing:-0.01em;margin-top:12px;">animus</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:26px 28px 0;font-size:19px;font-weight:600;color:${INK};letter-spacing:-0.01em;">
                      Sign in to animus
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:8px 28px 0;font-size:15px;line-height:1.6;color:${MUTED};">
                      This link signs you in once and expires in 5 minutes.
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:26px 28px;">
                      <a href="${url}" style="display:inline-block;background:${ACCENT};color:${ACCENT_TEXT};font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:10px;">
                        Sign in
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:0 28px;font-size:12px;color:${MUTED_DIM};">
                      or paste this link into your browser
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:6px 28px 26px;font-size:12px;line-height:1.5;word-break:break-all;">
                      <a href="${url}" style="color:${ACCENT};text-decoration:underline;">${url}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 28px;">
                      <div style="border-top:1px solid ${RULE};"></div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:18px 28px;font-size:12px;line-height:1.6;color:${MUTED_DIM};">
                      If you didn't request this, you can safely ignore this email.
                    </td>
                  </tr>
                  ${cornerRow(CORNER)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderMagicLinkText(url: string): string {
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
    html: renderMagicLinkHtml(url),
    text: renderMagicLinkText(url),
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
