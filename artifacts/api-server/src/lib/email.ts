import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL ?? "onboarding@resend.dev";

interface VerificationEmailOptions {
  to: string;
  name: string;
  verificationUrl: string;
}

/**
 * Send a verification email via Resend.
 * Configured via:
 *   RESEND_API_KEY — your Resend API key (required)
 *   FROM_EMAIL     — sender address (defaults to onboarding@resend.dev)
 */
export async function sendVerificationEmail(opts: VerificationEmailOptions): Promise<void> {
  const { to, name, verificationUrl } = opts;

  const { data, error } = await resend.emails.send({
    from: `Ughelli Vibes <${FROM_EMAIL}>`,
    to,
    subject: "Verify your Ughelli Vibes account",
    html: buildVerificationEmailHtml({ name, verificationUrl }),
    text: buildVerificationEmailText({ name, verificationUrl }),
  });

  if (error) {
    logger.error({ error, to }, "Failed to send verification email via Resend");
    throw new Error(`Email send failed: ${error.message}`);
  }

  logger.info({ messageId: data?.id, to }, "Verification email sent");
}

// ─── Email templates ─────────────────────────────────────────────────────────

function buildVerificationEmailHtml(opts: { name: string; verificationUrl: string }): string {
  const { name, verificationUrl } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Ughelli Vibes account</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: #f3f4f6;
      padding: 40px 16px;
      color: #1a1a2e;
    }
    .wrapper { max-width: 560px; margin: 0 auto; }
    .card {
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }
    .header {
      background: #0F8A5F;
      padding: 32px 40px;
      text-align: center;
    }
    .header-logo {
      width: 56px; height: 56px;
      background: rgba(255,255,255,0.2);
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }
    .header h1 {
      color: #fff;
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
    .body { padding: 40px; }
    .body p { font-size: 15px; color: #374151; line-height: 1.65; margin-bottom: 20px; }
    .btn-wrap { text-align: center; margin: 32px 0; }
    .btn {
      display: inline-block;
      background: #0F8A5F;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 36px;
      border-radius: 10px;
      letter-spacing: 0.2px;
    }
    .url-fallback {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 16px;
      word-break: break-all;
      font-size: 13px;
      color: #6b7280;
      line-height: 1.5;
      margin-top: -8px;
    }
    .expiry { font-size: 13px; color: #9ca3af; margin-top: 8px; }
    .footer {
      border-top: 1px solid #f3f4f6;
      padding: 24px 40px;
      text-align: center;
    }
    .footer p { font-size: 12px; color: #9ca3af; line-height: 1.6; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo">UV</div>
        <h1>Ughelli Vibes</h1>
      </div>
      <div class="body">
        <p>Hi ${escapeHtml(name)},</p>
        <p>
          Thanks for signing up! Click the button below to verify your email address
          and activate your account.
        </p>
        <div class="btn-wrap">
          <a href="${verificationUrl}" class="btn">Verify my email</a>
        </div>
        <p style="font-size:13px;color:#6b7280;margin-bottom:8px;">
          Or copy and paste this URL into your browser:
        </p>
        <div class="url-fallback">${verificationUrl}</div>
        <p class="expiry">This link expires in 24 hours.</p>
      </div>
      <div class="footer">
        <p>
          If you didn't create an account, you can safely ignore this email.<br />
          &copy; ${new Date().getFullYear()} Ughelli Vibes &mdash; Your local news network
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildVerificationEmailText(opts: { name: string; verificationUrl: string }): string {
  const { name, verificationUrl } = opts;
  return [
    `Hi ${name},`,
    ``,
    `Thanks for signing up for Ughelli Vibes! Please verify your email address by visiting the link below:`,
    ``,
    verificationUrl,
    ``,
    `This link expires in 24 hours.`,
    ``,
    `If you didn't create an account, you can safely ignore this email.`,
    ``,
    `— The Ughelli Vibes Team`,
  ].join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
