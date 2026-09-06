import nodemailer, { type Transporter } from "nodemailer";

/**
 * CodeRush email service (server-only).
 *
 * Security rules enforced by this module:
 * - Reads credentials ONLY from server-side env vars (EMAIL_USER,
 *   EMAIL_APP_PASSWORD). They are never imported into client components.
 * - Never logs or returns credentials; log output is sanitized.
 * - Callers receive a generic, safe error message.
 */

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;

export class EmailConfigurationError extends Error {
  constructor() {
    super(
      "Email service is not configured. Missing required email environment variables."
    );
    this.name = "EmailConfigurationError";
  }
}

export interface SendVerificationEmailInput {
  to: string;
  verificationUrl: string;
}

export interface SendEmailResult {
  success: boolean;
  /** Safe, user-facing message. Never contains credentials. */
  error?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    // Detailed reason goes to server logs only; thrown message is safe.
    console.error(
      "[email] Email service is not configured. Missing required email environment variables."
    );
    throw new EmailConfigurationError();
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true, // SMTPS over 465
    auth: { user, pass },
  });

  return transporter;
}

/**
 * Base URL for links inside emails. Always from the environment —
 * localhost is never hardcoded here.
 */
export function getAppUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) return null;
  return url.replace(/\/+$/, "");
}

/** Strips anything credential-like from server-side log output. */
function buildVerificationEmailHtml(verificationUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify your CodeRush email</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141414;border:1px solid #262626;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;text-align:center;">
                <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Code<span style="color:#10b981;">Rush</span></span>
                <p style="margin:8px 0 0 0;font-size:14px;color:#a3a3a3;">Sharpen your skills. Race the clock.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:20px;color:#ffffff;">Welcome to CodeRush! 🎉</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#d4d4d4;">
                  Thanks for creating an account. One quick step before you can start solving challenges:
                  <strong style="color:#ffffff;">please verify your email address</strong>.
                </p>
                <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#d4d4d4;">
                  Click the button below to confirm this email belongs to you.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding:0 0 24px 0;">
                      <a href="${verificationUrl}"
                         style="display:inline-block;background-color:#10b981;color:#0a0a0a;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;">
                        Verify Email
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px 0;font-size:13px;line-height:1.6;color:#a3a3a3;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 24px 0;font-size:13px;word-break:break-all;">
                  <a href="${verificationUrl}" style="color:#34d399;">${verificationUrl}</a>
                </p>
                <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#a3a3a3;">
                  This link expires in <strong style="color:#ffffff;">24 hours</strong> and can be used only once.
                </p>
                <div style="border-top:1px solid #262626;padding-top:16px;">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#737373;">
                    🔒 Security notice: If you didn't create a CodeRush account, you can safely ignore this email —
                    the account will not be activated. Never share this link; anyone with it can verify the account.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background-color:#0f0f0f;border-top:1px solid #262626;">
                <p style="margin:0;font-size:12px;color:#525252;text-align:center;">
                  © ${new Date().getFullYear()} CodeRush. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Sends the verification email via Gmail SMTP. Never throws — failures are
 * reported through the returned result so callers can surface a safe message.
 */
export async function sendVerificationEmail({
  to,
  verificationUrl,
}: SendVerificationEmailInput): Promise<SendEmailResult> {
  try {
    const mailer = getTransporter();

    await mailer.sendMail({
      from: `"CodeRush" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Verify your CodeRush email address",
      text: [
        "Welcome to CodeRush!",
        "",
        "Please verify your email address by opening the link below:",
        verificationUrl,
        "",
        "This link expires in 24 hours and can be used only once.",
        "",
        "If you didn't create a CodeRush account, you can safely ignore this email.",
      ].join("\n"),
      html: buildVerificationEmailHtml(verificationUrl),
    });

    return { success: true };
  } catch (error) {
    // Detailed diagnostics for server logs only — sanitized.
    if (error instanceof Error) {
      const details =
        "code" in error ? ` (code: ${String((error as { code?: unknown }).code)})` : "";
      console.error(
        `[email] Failed to send verification email: ${sanitizeLogValue(error.message)}${details}`
      );
    } else {
      console.error("[email] Failed to send verification email:", sanitizeLogValue(String(error)));
    }

    // Safe, generic message for the caller/frontend.
    const message =
      error instanceof EmailConfigurationError
        ? error.message
        : "Failed to send verification email. Please try again later.";

    return { success: false, error: message };
  }
}

function sanitizeLogValue(value: string): string {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  let out = value;
  if (pass) out = out.split(pass).join("***");
  if (user) out = out.split(user).join("***");
  return out;
}
