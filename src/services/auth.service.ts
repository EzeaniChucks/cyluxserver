import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AppDataSource } from "../database";
import { ParentEntity } from "../entities/Parent";
import { emailService } from "./email.service";
import { subscriptionService } from "./subscription.service";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error(
    "FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in environment variables"
  );
}

export class AuthService {
  private parentRepo = AppDataSource.getRepository(ParentEntity);

  async register(data: {
    email: string;
    name: string;
    password: string;
    referralCode?: string;
    country?: string;
    currency?: string;
    locale?: string;
    vpnFlagged?: boolean;
    detectedVia?: string;
  }) {
    if (!data.email || !data.name || !data.password) {
      throw new Error("All registration fields are required");
    }
    if (data.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const existing = await this.parentRepo.findOne({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (existing) throw new Error("Email already in use");

    // Validate referral code if provided (don't block registration if invalid)
    let validatedReferralCode: string | null = null;
    let parentReferrerId: string | null = null;
    if (data.referralCode) {
      try {
        const { influencerService } = await import('./influencer.service');
        const result = await influencerService.validateCode(data.referralCode);
        if (result?.valid) validatedReferralCode = data.referralCode.toUpperCase();
      } catch {
        // Non-fatal — registration proceeds without referral
      }

      // If not an influencer code, try as a parent referral code
      if (!validatedReferralCode) {
        try {
          const { parentReferralService } = await import('./parentReferral.service');
          const result = await parentReferralService.validateCode(data.referralCode);
          if (result?.valid && result.referrerId) {
            parentReferrerId = result.referrerId;
          }
        } catch {
          // Non-fatal
        }
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const parent = this.parentRepo.create({
      email: data.email.toLowerCase().trim(),
      name: data.name.trim(),
      passwordHash,
      referralCode: validatedReferralCode,
      country: data.country ?? null,
      currency: data.currency ?? 'usd',
      locale: data.locale ?? null,
      vpnFlagged: data.vpnFlagged ?? false,
      detectedVia: data.detectedVia ?? null,
    });

    await this.parentRepo.save(parent);

    // Create 3-day Premium trial subscription (no credit card required)
    await subscriptionService.createTrialSubscription(parent.id);

    // Record referral registration
    if (validatedReferralCode) {
      try {
        const { influencerService } = await import('./influencer.service');
        await influencerService.recordRegistration(validatedReferralCode, parent.id);
      } catch {
        // Non-fatal
      }
    }

    // Record parent-to-parent referral registration
    if (parentReferrerId) {
      try {
        const { parentReferralService } = await import('./parentReferral.service');
        await parentReferralService.recordRegistration(parentReferrerId, parent.id);
      } catch {
        // Non-fatal
      }
    }

    emailService.sendWelcome(parent.email, parent.name);

    const tokens = this.generateTokens(parent.id);
    return {
      tokens,
      user: { id: parent.id, email: parent.email, name: parent.name },
    };
  }

  async login(email: string, password: string) {
    const parent = await this.parentRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (!parent) throw new Error("Invalid credentials");

    // Check account lockout
    if (parent.lockedUntil && parent.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (parent.lockedUntil.getTime() - Date.now()) / 60000
      );
      throw new Error(
        `Account temporarily locked. Try again in ${minutesLeft} minute(s).`
      );
    }

    const isValid = await bcrypt.compare(password, parent.passwordHash);

    if (!isValid) {
      parent.failedLoginAttempts = (parent.failedLoginAttempts || 0) + 1;
      if (parent.failedLoginAttempts >= 5) {
        parent.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        console.warn(
          `[Auth] Account ${parent.email} locked after ${parent.failedLoginAttempts} failed attempts.`
        );
      }
      await this.parentRepo.save(parent);
      throw new Error("Invalid credentials");
    }

    // Reset failed attempts on successful login
    parent.failedLoginAttempts = 0;
    parent.lockedUntil = null;
    await this.parentRepo.save(parent);

    const tokens = this.generateTokens(parent.id);
    return {
      tokens,
      user: { id: parent.id, email: parent.email, name: parent.name },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET!) as {
        id: string;
      };
      const parent = await this.parentRepo.findOne({
        where: { id: decoded.id },
      });
      if (!parent) throw new Error("Invalid session");

      return this.generateTokens(parent.id);
    } catch (e) {
      throw new Error("Refresh token expired or invalid");
    }
  }

  async forgotPassword(email: string) {
    const parent = await this.parentRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });
    if (!parent) return; // Silent return for security

    // Cryptographically secure 64-char hex token
    const resetToken = crypto.randomBytes(32).toString("hex");
    parent.resetPasswordToken = resetToken;
    parent.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await this.parentRepo.save(parent);

    await emailService.sendPasswordReset(parent.email, parent.name, resetToken);
    console.log(`[Auth] Password reset email dispatched to ${email}`);
  }

  async resetPassword(token: string, newPass: string) {
    if (!token || typeof token !== "string") {
      throw new Error("Reset token is invalid or has expired");
    }
    if (!newPass || newPass.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    const parent = await this.parentRepo.findOne({
      where: { resetPasswordToken: token },
    });

    if (
      !parent ||
      !parent.resetPasswordExpires ||
      parent.resetPasswordExpires < new Date()
    ) {
      throw new Error("Reset token is invalid or has expired");
    }

    parent.passwordHash = await bcrypt.hash(newPass, 12);
    parent.resetPasswordToken = null as any;
    parent.resetPasswordExpires = null as any;
    await this.parentRepo.save(parent);

    return true;
  }

  private generateTokens(userId: string) {
    const accessToken = jwt.sign({ id: userId, role: "parent" }, JWT_SECRET!, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ id: userId }, JWT_REFRESH_SECRET!, {
      expiresIn: "7d",
    });
    return { accessToken, refreshToken };
  }
}
