// cyluxserver/src/services/sms.service.ts
// Thin Twilio wrapper for critical SMS alerts (SOS only).
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in env to enable.

let twilioClient: any = null;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

if (
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  fromNumber
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('[SmsService] Twilio initialised — SMS alerts enabled.');
  } catch {
    console.warn('[SmsService] twilio package not installed — SMS alerts disabled.');
  }
} else {
  console.warn('[SmsService] TWILIO_* env vars not set — SMS alerts disabled.');
}

export class SmsService {
  async send(to: string, body: string): Promise<void> {
    if (!twilioClient || !fromNumber) {
      console.warn(`[SmsService] Skipping SMS to ${to} — Twilio not configured.`);
      return;
    }
    try {
      await twilioClient.messages.create({ to, from: fromNumber, body });
      console.log(`[SmsService] SMS sent to ${to}`);
    } catch (err: any) {
      console.error(`[SmsService] Failed to send SMS to ${to}:`, err.message);
    }
  }

  async sendSosAlert(to: string, childName: string, location: { lat: number; lng: number } | null): Promise<void> {
    const loc = location
      ? ` Location: https://www.google.com/maps?q=${location.lat},${location.lng}`
      : '';
    await this.send(to, `CYLUX SOS: ${childName} has pressed the emergency panic button!${loc} Open the Cylux app now.`);
  }
}

export const smsService = new SmsService();
