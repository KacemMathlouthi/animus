/** Email delivery (Resend). Falls back to logging the link to the console when
 * RESEND_API_KEY is unset or a send fails, so local dev is never blocked. */

import { readFile } from "node:fs/promises";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM ?? "animus <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

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

/** Read + cache the logo PNG (committed alongside this module). */
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

export async function deliverMagicLink({
  email,
  url,
}: {
  email: string;
  url: string;
}): Promise<void> {
  if (!resend) {
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
    console.error("Failed to send magic link via Resend:", error);
    // Don't block local dev — surface the link so it's still usable.
    console.log(`Magic link for ${email}: ${url}`);
  }
}
