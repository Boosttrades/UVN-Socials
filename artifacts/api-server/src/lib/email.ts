import { logger } from "./logger";

interface VerificationEmailOptions {
  to: string;
  name: string;
  verificationUrl: string;
}

/**
 * Send a verification email.
 *
 * In development this logs the link to the console so you can click it manually.
 * Swap `sendVerificationEmail` for a real provider (Resend, SendGrid, etc.)
 * when you're ready for production — the interface stays the same.
 */
export async function sendVerificationEmail(opts: VerificationEmailOptions): Promise<void> {
  // TODO: replace with a real email provider before going to production
  logger.info(
    {
      to: opts.to,
      verificationUrl: opts.verificationUrl,
    },
    `📧 [DEV] Verification email for ${opts.name} <${opts.to}>`
  );
  console.log(
    `\n📧 ─────────────────────────────────────────\n` +
      `   To: ${opts.name} <${opts.to}>\n` +
      `   Subject: Verify your Ughelli Vibes account\n` +
      `\n` +
      `   Click to verify:\n` +
      `   ${opts.verificationUrl}\n` +
      `─────────────────────────────────────────\n`
  );
}
