import sgMail from '@sendgrid/mail';

// Tracks whether the SDK has been initialised with a real key.
// Avoids crashing the server at startup; instead, send() logs a warning and no-ops.
let emailEnabled = false;

const sendGridKey = process.env.SENDGRID_API_KEY;
if (sendGridKey) {
  sgMail.setApiKey(sendGridKey);
  emailEnabled = true;
} else {
  console.warn('[EmailService] SENDGRID_API_KEY not set — email sending is disabled.');
}

export class EmailService {
  constructor() {
    // Initialisation is done at module load time above; nothing needed here.
  }

  private getBaseTemplate(content: string, title: string) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
            .wrapper { width: 100%; padding: 40px 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .header { background-color: #6366f1; padding: 40px; text-align: center; }
            .logo-text { color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -1px; margin: 0; }
            .content { padding: 40px; color: #1e293b; line-height: 1.6; }
            .footer { padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; background: #f1f5f9; }
            .button { display: inline-block; padding: 14px 28px; background-color: #6366f1; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 24px; }
            h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <p class="logo-text">Cylux</p>
              </div>
              <div class="content">
                <h1>${title}</h1>
                ${content}
              </div>
              <div class="footer">
                &copy; 2025 Cylux Parental Control. Secure. Trusted. Reliable.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async send(to: string, subject: string, html: string) {
    if (!emailEnabled) {
      console.warn(`[EmailService] Skipping email to ${to} — SENDGRID_API_KEY not configured.`);
      return;
    }
    const from = process.env.FROM_EMAIL || 'noreply@cylux.co';
    try {
      await sgMail.send({ to, from, subject, html });
      console.log(`[EmailService] Message sent to ${to}`);
    } catch (error: any) {
      console.error(`[EmailService] Failed to send email to ${to}:`, error.response?.body || error.message);
    }
  }

  async sendPasswordReset(to: string, name: string, token: string) {
    // In a real app, this would be a link to your frontend reset page
    const resetLink = `https://app.cylux.co/reset-password?token=${token}`;
    
    const content = `
      <p>Hello ${name},</p>
      <p>We received a request to reset your password for your Cylux account. If you didn't make this request, you can safely ignore this email.</p>
      <p>To reset your password, click the button below:</p>
      <center>
        <a href="${resetLink}" class="button">Reset My Password</a>
      </center>
      <p style="margin-top: 30px; font-size: 13px; color: #64748b;">
        Or copy and paste this link into your browser:<br>
        <span style="word-break: break-all; color: #6366f1;">${resetLink}</span>
      </p>
    `;

    const html = this.getBaseTemplate(content, 'Password Reset Request');
    return this.send(to, 'Cylux: Reset Your Password', html);
  }

  async sendTrialEndingReminder(to: string, name: string, daysLeft: number) {
    const content = `
      <p>Hi ${name},</p>
      <p>Your Cylux free trial ends in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
      <p>To keep protecting your family without interruption, choose a plan before your trial expires.</p>
      <center>
        <a href="https://app.cylux.co/subscription" class="button">Choose a Plan</a>
      </center>
    `;
    const html = this.getBaseTemplate(content, `Your Trial Ends in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`);
    return this.send(to, 'Cylux: Your free trial is ending soon', html);
  }

  async sendSubscriptionActivated(to: string, name: string, planName: string) {
    const content = `
      <p>Hi ${name},</p>
      <p>Your <strong>${planName}</strong> subscription is now active. Thank you for choosing Cylux!</p>
      <p>Your family's digital safety is our priority — we're glad to have you on board.</p>
      <center>
        <a href="https://app.cylux.co/dashboard" class="button">Go to Dashboard</a>
      </center>
    `;
    const html = this.getBaseTemplate(content, `Welcome to ${planName}!`);
    return this.send(to, `Cylux: Your ${planName} subscription is active`, html);
  }

  async sendPaymentFailed(to: string, name: string) {
    const content = `
      <p>Hi ${name},</p>
      <p>We were unable to process your latest payment for Cylux. Your account access may be restricted until payment is resolved.</p>
      <p>Please update your payment method to continue protecting your family.</p>
      <center>
        <a href="https://app.cylux.co/subscription" class="button">Update Payment Method</a>
      </center>
    `;
    const html = this.getBaseTemplate(content, 'Action Required: Payment Failed');
    return this.send(to, 'Cylux: Payment failed — action required', html);
  }

  async sendSosAlert(
    to: string,
    parentName: string,
    childName: string,
    location: { lat: number; lng: number } | null,
    timestamp: Date,
  ) {
    const timeStr = timestamp.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const mapLink = location
      ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
      : null;

    const content = `
      <p>Hi ${parentName},</p>
      <p style="font-size:16px; font-weight:900; color:#ef4444;">&#x26A0; ${childName} has pressed the SOS panic button.</p>
      <p>This alert was triggered at <strong>${timeStr}</strong>.</p>
      ${location ? `
      <p>Last known location:</p>
      <center>
        <a href="${mapLink}" class="button" style="background-color:#ef4444;">View on Map</a>
      </center>
      <p style="font-size:12px; color:#94a3b8; margin-top:8px;">${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
      ` : '<p style="color:#94a3b8;">No GPS location available at this time.</p>'}
      <p style="margin-top:24px;">Open the Cylux app immediately to check on ${childName}.</p>
    `;

    const html = this.getBaseTemplate(content, `SOS Alert from ${childName}`);
    return this.send(to, `SOS ALERT: ${childName} needs help!`, html);
  }

  async sendWelcome(to: string, name: string) {
    const content = `
      <p>Hi ${name},</p>
      <p>Welcome to Cylux! You've taken the first step toward a safer digital environment for your family.</p>
      <p>Sign in to your dashboard to start adding your children's devices and configuring safety policies.</p>
      <center>
        <a href="https://app.cylux.co/dashboard" class="button">Go to Dashboard</a>
      </center>
    `;
    const html = this.getBaseTemplate(content, 'Welcome to Cylux');
    return this.send(to, 'Welcome to Cylux!', html);
  }
}

export const emailService = new EmailService();