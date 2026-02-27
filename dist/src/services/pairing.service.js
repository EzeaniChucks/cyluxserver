"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PairingService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database");
const Pairing_1 = require("../entities/Pairing");
const Child_1 = require("../entities/Child");
const Parent_1 = require("../entities/Parent");
const email_service_1 = require("./email.service");
const DEVICE_JWT_SECRET = process.env.DEVICE_JWT_SECRET;
if (!DEVICE_JWT_SECRET) {
    throw new Error('FATAL: DEVICE_JWT_SECRET must be set in environment variables');
}
class PairingService {
    constructor() {
        this.pairingRepo = database_1.AppDataSource.getRepository(Pairing_1.PairingEntity);
        this.childRepo = database_1.AppDataSource.getRepository(Child_1.ChildEntity);
        this.parentRepo = database_1.AppDataSource.getRepository(Parent_1.ParentEntity);
    }
    regeneratePairingCodeForChild(parentId, childId) {
        return __awaiter(this, void 0, void 0, function* () {
            const child = yield this.childRepo.findOne({
                where: { id: childId },
                relations: ['parent'],
            });
            if (!child)
                throw new Error('Child not found');
            if (child.parent.id !== parentId)
                throw new Error('Not authorized');
            return this.createPairingCode(parentId, child.name);
        });
    }
    createPairingCode(parentId, childName) {
        return __awaiter(this, void 0, void 0, function* () {
            // Cryptographically random 6-digit code using OS CSPRNG
            const code = crypto_1.default.randomInt(100000, 1000000).toString();
            const expiresAt = new Date(Date.now() + 15 * 60000);
            const pairing = this.pairingRepo.create({
                code,
                parentId,
                childName,
                expiresAt,
            });
            return yield this.pairingRepo.save(pairing);
        });
    }
    /** Read-only lookup — no attempt increment. Used for pre-checks (e.g. subscription limit). */
    findByCode(code) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.pairingRepo.findOne({ where: { code } });
        });
    }
    pairDevice(code, deviceId, deviceType) {
        return __awaiter(this, void 0, void 0, function* () {
            const pairing = yield this.pairingRepo.findOne({
                where: { code },
            });
            if (!pairing)
                throw new Error('Invalid pairing code');
            // Enforce attempt limit before expiry check to prevent oracle attacks
            pairing.attemptCount = (pairing.attemptCount || 0) + 1;
            if (pairing.attemptCount > 5) {
                yield this.pairingRepo.delete(pairing.id);
                throw new Error('Too many attempts. Request a new pairing code.');
            }
            yield this.pairingRepo.save(pairing);
            if (pairing.expiresAt < new Date())
                throw new Error('Pairing code expired');
            const parent = yield this.parentRepo.findOne({ where: { id: pairing.parentId } });
            if (!parent)
                throw new Error('Parent account not found');
            // Check if child already exists by hardware deviceId
            let child = yield this.childRepo.findOne({
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
                if (deviceType)
                    child.deviceType = deviceType;
            }
            else {
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
            const deviceToken = jsonwebtoken_1.default.sign({ deviceId: child.id, role: 'child' }, DEVICE_JWT_SECRET, { expiresIn: '365d' });
            child.deviceJwt = deviceToken;
            yield this.childRepo.save(child);
            // Cleanup pairing record
            yield this.pairingRepo.delete(pairing.id);
            // Notify Parent
            yield email_service_1.emailService.send(parent.email, `Node Enrolled: ${pairing.childName}`, `<p>Managed Node <b>${pairing.childName}</b> has successfully synchronized with the GuardianHub cluster using ${(deviceType === null || deviceType === void 0 ? void 0 : deviceType.toUpperCase()) || 'unknown'} protocol.</p>`);
            return { child, deviceToken };
        });
    }
}
exports.PairingService = PairingService;
//# sourceMappingURL=pairing.service.js.map