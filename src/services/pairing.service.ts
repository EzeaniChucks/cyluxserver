import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../database';
import { PairingEntity } from '../entities/Pairing';
import { ChildEntity } from '../entities/Child';
import { ParentEntity } from '../entities/Parent';
import { emailService } from './email.service';

const DEVICE_JWT_SECRET = process.env.DEVICE_JWT_SECRET;

if (!DEVICE_JWT_SECRET) {
  throw new Error('FATAL: DEVICE_JWT_SECRET must be set in environment variables');
}

export class PairingService {
  private pairingRepo = AppDataSource.getRepository(PairingEntity);
  private childRepo = AppDataSource.getRepository(ChildEntity);
  private parentRepo = AppDataSource.getRepository(ParentEntity);

  async regeneratePairingCodeForChild(parentId: string, childId: string) {
    const child = await this.childRepo.findOne({
      where: { id: childId },
      relations: ['parent'],
    });
    if (!child) throw new Error('Child not found');
    if (child.parent.id !== parentId) throw new Error('Not authorized');
    return this.createPairingCode(parentId, child.name);
  }

  async createPairingCode(parentId: string, childName: string) {
    // Cryptographically random 6-digit code using OS CSPRNG
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60000);

    const pairing = this.pairingRepo.create({
      code,
      parentId,
      childName,
      expiresAt,
    });

    return await this.pairingRepo.save(pairing);
  }

  /** Read-only lookup — no attempt increment. Used for pre-checks (e.g. subscription limit). */
  async findByCode(code: string) {
    return this.pairingRepo.findOne({ where: { code } });
  }

  async pairDevice(code: string, deviceId: string, deviceType?: 'ios' | 'android') {
    const pairing = await this.pairingRepo.findOne({
      where: { code },
    });

    if (!pairing) throw new Error('Invalid pairing code');

    // Enforce attempt limit before expiry check to prevent oracle attacks
    pairing.attemptCount = (pairing.attemptCount || 0) + 1;
    if (pairing.attemptCount > 5) {
      await this.pairingRepo.delete(pairing.id);
      throw new Error('Too many attempts. Request a new pairing code.');
    }
    await this.pairingRepo.save(pairing);

    if (pairing.expiresAt < new Date()) throw new Error('Pairing code expired');

    const parent = await this.parentRepo.findOne({ where: { id: pairing.parentId } });
    if (!parent) throw new Error('Parent account not found');

    // Check if child already exists by hardware deviceId
    let child = await this.childRepo.findOne({
      where: { id: deviceId },
      relations: ['parent'],
    });

    if (child) {
      // Re-enrollment: wipe old audit history association by clearing deviceJwt and reassigning
      child.name = pairing.childName;
      child.parent = parent;
      child.isEnrolled = true;
      child.status = 'active';
      child.lastSeen = new Date();
      if (deviceType) child.deviceType = deviceType;
    } else {
      child = this.childRepo.create({
        id: deviceId,
        name: pairing.childName,
        parent: parent,
        status: 'active',
        isEnrolled: true,
        lastSeen: new Date(),
        deviceType: deviceType,
      });
    }

    // Issue a signed device JWT (365-day validity; re-issued on re-enrollment)
    const deviceToken = jwt.sign(
      { deviceId: child.id, role: 'child' },
      DEVICE_JWT_SECRET!,
      { expiresIn: '365d' }
    );
    child.deviceJwt = deviceToken;

    await this.childRepo.save(child);

    // Cleanup pairing record
    await this.pairingRepo.delete(pairing.id);

    // Notify Parent
    await emailService.send(
      parent.email,
      `Node Enrolled: ${pairing.childName}`,
      `<p>Managed Node <b>${pairing.childName}</b> has successfully synchronized with the GuardianHub cluster using ${deviceType?.toUpperCase() || 'unknown'} protocol.</p>`
    );

    return { child, deviceToken };
  }
}
