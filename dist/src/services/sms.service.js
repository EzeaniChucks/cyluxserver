"use strict";
// cyluxserver/src/services/sms.service.ts
// Thin Twilio wrapper for critical SMS alerts (SOS only).
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in env to enable.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsService = exports.SmsService = void 0;
let twilioClient = null;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
if (process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    fromNumber) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const twilio = require('twilio');
        twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('[SmsService] Twilio initialised — SMS alerts enabled.');
    }
    catch (_a) {
        console.warn('[SmsService] twilio package not installed — SMS alerts disabled.');
    }
}
else {
    console.warn('[SmsService] TWILIO_* env vars not set — SMS alerts disabled.');
}
class SmsService {
    send(to, body) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!twilioClient || !fromNumber) {
                console.warn(`[SmsService] Skipping SMS to ${to} — Twilio not configured.`);
                return;
            }
            try {
                yield twilioClient.messages.create({ to, from: fromNumber, body });
                console.log(`[SmsService] SMS sent to ${to}`);
            }
            catch (err) {
                console.error(`[SmsService] Failed to send SMS to ${to}:`, err.message);
            }
        });
    }
    sendSosAlert(to, childName, location) {
        return __awaiter(this, void 0, void 0, function* () {
            const loc = location
                ? ` Location: https://www.google.com/maps?q=${location.lat},${location.lng}`
                : '';
            yield this.send(to, `CYLUX SOS: ${childName} has pressed the emergency panic button!${loc} Open the Cylux app now.`);
        });
    }
}
exports.SmsService = SmsService;
exports.smsService = new SmsService();
//# sourceMappingURL=sms.service.js.map