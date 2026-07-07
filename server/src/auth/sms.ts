// SMS OTP functionality has been replaced by email OTP (Resend).
// All OTP verification now uses email instead of SMS.
// The code below is preserved for reference.

// import crypto from 'crypto';
// import logger from '../logger.js';
// import { config } from '../config/validation.js';
// import { Vonage } from '@vonage/server-sdk';

// const USE_DEV_SMS_MODE = !config.VONAGE_API_KEY || !config.VONAGE_API_SECRET;

// const devSmsCodes = new Map<string, { code: string; expiresAt: number }>();

// function ensureVonageConfig() {
//   if (!config.VONAGE_API_KEY || !config.VONAGE_API_SECRET) {
//     throw new Error('Vonage SMS is not configured');
//   }
// }

// async function getVonageClient() {
//   ensureVonageConfig();
//   return new Vonage({
//     apiKey: config.VONAGE_API_KEY!,
//     apiSecret: config.VONAGE_API_SECRET!,
//   });
// }

// export async function sendSmsVerification(phoneNumberE164: string) {
//   if (USE_DEV_SMS_MODE) {
//     const code = crypto.randomInt(100000, 1000000).toString();
//     const expiresAt = Date.now() + 10 * 60 * 1000;
//     devSmsCodes.set(phoneNumberE164, { code, expiresAt });
//     logger.info(`[DEV SMS MODE] OTP code for ${phoneNumberE164}: ${code}`);
//     logger.info(`[DEV SMS MODE] Code expires in 10 minutes`);
//     return { success: true as const };
//   }

//   try {
//     const vonage = await getVonageClient();
//     const code = crypto.randomInt(100000, 1000000).toString();
//     const expiresAt = Date.now() + 10 * 60 * 1000;
//     devSmsCodes.set(phoneNumberE164, { code, expiresAt });

//     await vonage.sms.send({
//       to: phoneNumberE164,
//       from: config.VONAGE_FROM_NUMBER || 'Asset Management',
//       text: `Your verification code is: ${code}. Valid for 10 minutes.`,
//     });

//     logger.info(`[VONAGE] SMS verification sent to ${phoneNumberE164}, code: ${code}`);
//     return { success: true as const };
//   } catch (error: any) {
//     logger.error('[VONAGE] Failed to send SMS verification', {
//       message: error?.message,
//       code: error?.code,
//       status: error?.status,
//       details: error,
//     });
//     return { error: `Failed to send SMS OTP: ${error?.message || 'Unknown error'}` };
//   }
// }

// export async function checkSmsVerification(phoneNumberE164: string, code: string) {
//   const stored = devSmsCodes.get(phoneNumberE164);
//   if (!stored) {
//     logger.warn(`[SMS] No OTP found for ${phoneNumberE164}`);
//     return { error: 'Invalid or expired OTP' };
//   }
//   if (Date.now() > stored.expiresAt) {
//     devSmsCodes.delete(phoneNumberE164);
//     logger.warn(`[SMS] OTP expired for ${phoneNumberE164}`);
//     return { error: 'Invalid or expired OTP' };
//   }
//   if (stored.code !== code) {
//     logger.warn(`[SMS] Invalid OTP for ${phoneNumberE164}`);
//     return { error: 'Invalid or expired OTP' };
//   }
//   devSmsCodes.delete(phoneNumberE164);
//   logger.info(`[SMS] OTP verified for ${phoneNumberE164}`);
//   return { success: true as const };
// }
