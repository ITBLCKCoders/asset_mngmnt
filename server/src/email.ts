import { Resend } from 'resend';
import dotenv from 'dotenv';
import { emailConfig } from './config/database.js';

dotenv.config();

const apiKey = emailConfig.resendApiKey;

if (!apiKey || apiKey === 'your_resend_api_key_here' || apiKey.length < 10) {
  console.warn(
    '[EMAIL] Resend API key not configured or invalid. Email sending will be disabled.'
  );
}

const resend =
  apiKey && apiKey !== 'your_resend_api_key_here' && apiKey.length >= 10
    ? new Resend(apiKey)
    : null;

interface EmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

let sending = false;
const queue: EmailOptions[] = [];

async function flush() {
  if (sending || queue.length === 0 || !resend) return;
  sending = true;
  const mail = queue.shift()!;
  try {
    const response = await resend.emails.send(mail);
    console.log(`[EMAIL] Sent → ${mail.to}`);
    console.log(`[RESEND] Full Response:`, JSON.stringify(response, null, 2));
    console.log(
      `[RESEND] Response ID: ${response?.data?.id || 'Email sent successfully'}`
    );
  } catch (e: any) {
    console.error(`[EMAIL] Failed → ${mail.to}: ${e.message}`);
    console.error(`[RESEND] Error details:`, e.response?.data || e.message);
  } finally {
    sending = false;
    setTimeout(flush, 100);
  }
}

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  link?: string
) => {
  if (link) console.log(`\n[VERIFY LINK] ${link}\n`);

  if (!resend) {
    console.warn('[EMAIL] Cannot send email: Resend API key not configured');
    return;
  }

  queue.push({
    from: emailConfig.fromEmail || 'Asset Management <onboarding@resend.dev>', // Use Resend's verified domain
    to,
    subject,
    html,
  });
  flush();
};
