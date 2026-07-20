import { Resend } from 'resend';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = config.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('RESEND_API_KEY is not configured. Email OTP delivery will be logged only.');
    return null;
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  // Always log demo OTP to console for seamless testing
  console.log(`\n========================================\n🔑 DEMO OTP FOR ${to}: ${code}\n========================================\n`);

  const resend = getResendClient();
  if (!resend) {
    logger.info(`[Email Stub] Send OTP ${code} to ${to}`);
    return;
  }

  const subject = 'Your DengueGuard Verification Code';
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 0 auto;">
      <h2 style="color: #0f172a; border-bottom: 2px solid #22c55e; padding-bottom: 8px;">DengueGuard Verification</h2>
      <p style="font-size: 16px; margin: 20px 0;">Hello,</p>
      <p style="font-size: 16px;">You requested a verification code to access DengueGuard. Please use the 6-digit code below to continue:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #15803d; letter-spacing: 4px; background-color: #f0fdf4; padding: 12px 24px; border: 1px dashed #86efac; border-radius: 6px; display: inline-block;">${code}</span>
      </div>
      <p style="font-size: 14px; color: #64748b;">This code will expire in ${Math.round(config.OTP_EXPIRES_IN_SECONDS / 60)} minutes. If you did not request this code, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">DengueGuard AI Platform — Colombo, Sri Lanka</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: config.RESEND_FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      logger.warn('Failed to send OTP email via Resend (continuing with logged demo OTP)', { error });
    } else {
      logger.info('OTP email sent successfully via Resend', { id: data?.id, to });
    }
  } catch (err) {
    logger.warn('Resend email error (continuing with logged demo OTP)', { error: (err as Error).message });
  }
}
