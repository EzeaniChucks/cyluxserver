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
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoService = void 0;
// ── Lookup tables ─────────────────────────────────────────────────────────────
/**
 * ISO 3166-1 alpha-2 → ISO 4217 lowercase currency.
 * Eurozone countries all map to 'eur'.
 */
const COUNTRY_CURRENCY = {
    // Major English-speaking
    US: 'usd', GB: 'gbp', CA: 'cad', AU: 'aud', NZ: 'nzd',
    // Eurozone
    DE: 'eur', FR: 'eur', IT: 'eur', ES: 'eur', NL: 'eur', BE: 'eur',
    AT: 'eur', PT: 'eur', FI: 'eur', IE: 'eur', GR: 'eur', SK: 'eur',
    SI: 'eur', EE: 'eur', LV: 'eur', LT: 'eur', LU: 'eur', MT: 'eur',
    CY: 'eur', HR: 'eur',
    // Europe (non-eurozone)
    CH: 'chf', SE: 'sek', NO: 'nok', DK: 'dkk', PL: 'pln',
    CZ: 'czk', HU: 'huf', RO: 'ron', TR: 'try',
    // Africa
    NG: 'ngn', GH: 'ghs', KE: 'kes', ZA: 'zar', EG: 'egp',
    TZ: 'tzs', UG: 'ugx', RW: 'rwf', ET: 'etb', SN: 'xof',
    CI: 'xof', CM: 'xaf', TN: 'tnd', MA: 'mad', ZM: 'zmw',
    ZW: 'usd', MZ: 'mzn', AO: 'aoa',
    // Asia
    IN: 'inr', PK: 'pkr', BD: 'bdt', LK: 'lkr',
    PH: 'php', ID: 'idr', MY: 'myr', TH: 'thb', VN: 'vnd',
    SG: 'sgd', HK: 'hkd', JP: 'jpy', KR: 'krw', CN: 'cny',
    AE: 'aed', SA: 'sar', QA: 'qar', KW: 'kwd', BH: 'bhd',
    IL: 'ils', JO: 'jod',
    // Americas
    BR: 'brl', MX: 'mxn', AR: 'ars', CO: 'cop', CL: 'clp',
    PE: 'pen', UY: 'uyu', EC: 'usd', PA: 'usd', JM: 'jmd',
    TT: 'ttd',
};
/**
 * SIM MCC prefix (3 digits) → ISO 3166-1 alpha-2 country.
 * Only the first 3 digits of a full MCC are needed to identify the country.
 */
const MCC_COUNTRY = {
    // North America
    '310': 'US', '311': 'US', '312': 'US', '313': 'US', '314': 'US',
    '315': 'US', '316': 'US', '302': 'CA', '334': 'MX',
    // Europe
    '234': 'GB', '235': 'GB', '208': 'FR', '262': 'DE', '222': 'IT',
    '214': 'ES', '204': 'NL', '206': 'BE', '232': 'AT', '268': 'PT',
    '244': 'FI', '272': 'IE', '202': 'GR', '231': 'SK', '293': 'SI',
    '248': 'EE', '247': 'LV', '246': 'LT', '270': 'LU', '228': 'CH',
    '240': 'SE', '242': 'NO', '238': 'DK', '260': 'PL', '230': 'CZ',
    '216': 'HU', '226': 'RO', '286': 'TR',
    // Oceania
    '505': 'AU', '530': 'NZ',
    // Africa
    '621': 'NG', '620': 'GH', '639': 'KE', '655': 'ZA', '602': 'EG',
    '640': 'TZ', '641': 'UG', '635': 'RW', '636': 'ET', '608': 'SN',
    '612': 'CI', '624': 'CM', '603': 'DZ', '604': 'MA', '605': 'TN',
    '645': 'ZM', '650': 'MW',
    // Asia
    '404': 'IN', '405': 'IN', '406': 'IN', '410': 'PK', '470': 'BD',
    '413': 'LK', '515': 'PH', '510': 'ID', '502': 'MY', '520': 'TH',
    '452': 'VN', '525': 'SG', '454': 'HK', '440': 'JP', '450': 'KR',
    '460': 'CN', '424': 'AE', '420': 'SA', '427': 'QA', '416': 'JO',
    '425': 'IL',
    // South America
    '724': 'BR', '722': 'AR', '732': 'CO', '730': 'CL', '716': 'PE',
    '748': 'UY',
    // Caribbean
    '338': 'JM', '374': 'TT',
};
/**
 * IANA timezone → ISO 3166-1 alpha-2 country.
 * Covers the most common timezones globally.
 */
const TZ_COUNTRY = {
    // Africa
    'Africa/Lagos': 'NG', 'Africa/Accra': 'GH', 'Africa/Nairobi': 'KE',
    'Africa/Johannesburg': 'ZA', 'Africa/Cairo': 'EG', 'Africa/Dar_es_Salaam': 'TZ',
    'Africa/Kampala': 'UG', 'Africa/Kigali': 'RW', 'Africa/Addis_Ababa': 'ET',
    'Africa/Dakar': 'SN', 'Africa/Abidjan': 'CI', 'Africa/Douala': 'CM',
    'Africa/Tunis': 'TN', 'Africa/Casablanca': 'MA', 'Africa/Lusaka': 'ZM',
    'Africa/Luanda': 'AO', 'Africa/Maputo': 'MZ',
    // Americas
    'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
    'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
    'Pacific/Honolulu': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
    'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Buenos_Aires': 'AR',
    'America/Bogota': 'CO', 'America/Santiago': 'CL', 'America/Lima': 'PE',
    'America/Montevideo': 'UY', 'America/Jamaica': 'JM', 'America/Port_of_Spain': 'TT',
    // Europe
    'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
    'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Amsterdam': 'NL',
    'Europe/Brussels': 'BE', 'Europe/Vienna': 'AT', 'Europe/Lisbon': 'PT',
    'Europe/Helsinki': 'FI', 'Europe/Dublin': 'IE', 'Europe/Athens': 'GR',
    'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU',
    'Europe/Bucharest': 'RO', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
    'Europe/Copenhagen': 'DK', 'Europe/Zurich': 'CH', 'Europe/Istanbul': 'TR',
    // Asia
    'Asia/Kolkata': 'IN', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD',
    'Asia/Colombo': 'LK', 'Asia/Manila': 'PH', 'Asia/Jakarta': 'ID',
    'Asia/Kuala_Lumpur': 'MY', 'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN',
    'Asia/Singapore': 'SG', 'Asia/Hong_Kong': 'HK', 'Asia/Tokyo': 'JP',
    'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Dubai': 'AE',
    'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Kuwait': 'KW',
    'Asia/Beirut': 'LB', 'Asia/Amman': 'JO', 'Asia/Jerusalem': 'IL',
    // Oceania
    'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU', 'Pacific/Auckland': 'NZ',
};
// ── Service ───────────────────────────────────────────────────────────────────
class GeoService {
    /**
     * Extract the real client IP from a request, handling load-balancer
     * X-Forwarded-For headers correctly. The leftmost IP in XFF is always
     * the original client.
     */
    getClientIp(req) {
        var _a;
        const xff = req.headers['x-forwarded-for'];
        if (xff) {
            const first = (typeof xff === 'string' ? xff : xff[0]).split(',')[0].trim();
            if (first)
                return first;
        }
        return ((_a = req.socket) === null || _a === void 0 ? void 0 : _a.remoteAddress) || '127.0.0.1';
    }
    isPrivateIp(ip) {
        return (ip === '127.0.0.1' ||
            ip === '::1' ||
            ip.startsWith('192.168.') ||
            ip.startsWith('10.') ||
            ip.startsWith('172.16.') ||
            ip.startsWith('172.17.') ||
            ip.startsWith('172.18.') ||
            ip.startsWith('172.19.') ||
            ip.startsWith('172.2') ||
            ip.startsWith('172.30.') ||
            ip.startsWith('172.31.'));
    }
    lookupIp(ip) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKey = process.env.IPDATA_API_KEY;
            if (!apiKey || this.isPrivateIp(ip))
                return null;
            try {
                const url = `https://api.ipdata.co/${ip}?api-key=${apiKey}&fields=country_code,languages,currency,threat`;
                const res = yield fetch(url, { signal: AbortSignal.timeout(3000) });
                if (!res.ok)
                    return null;
                return res.json();
            }
            catch (_a) {
                // Network error or timeout — non-fatal, fall back to other signals
                return null;
            }
        });
    }
    /** Extract country code from a BCP-47 locale string, e.g. 'en-NG' → 'NG'. */
    countryFromLocale(locale) {
        const parts = locale.split('-');
        if (parts.length >= 2) {
            const tag = parts[parts.length - 1].toUpperCase();
            if (tag.length === 2 && /^[A-Z]{2}$/.test(tag))
                return tag;
        }
        return null;
    }
    /**
     * Detect the user's country, currency, and locale using multiple signals.
     * Signals are weighted; the country with the highest total weight wins.
     *
     * Weights:
     *   SIM MCC   4  (hardware-level, extremely hard to fake)
     *   IP geo    3  (reliable unless VPN — reduced to 1 if VPN detected)
     *   Timezone  2  (easy to change but most users don't bother)
     *   Locale    1  (weakest — trivially changed in device settings)
     */
    detect(req_1) {
        return __awaiter(this, arguments, void 0, function* (req, signals = {}) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const ip = this.getClientIp(req);
            const ipData = yield this.lookupIp(ip);
            const vpnFlagged = !!(((_a = ipData === null || ipData === void 0 ? void 0 : ipData.threat) === null || _a === void 0 ? void 0 : _a.is_vpn) ||
                ((_b = ipData === null || ipData === void 0 ? void 0 : ipData.threat) === null || _b === void 0 ? void 0 : _b.is_proxy) ||
                ((_c = ipData === null || ipData === void 0 ? void 0 : ipData.threat) === null || _c === void 0 ? void 0 : _c.is_tor));
            // Collect weighted candidate countries
            const candidates = [];
            // SIM MCC — strongest signal on mobile
            if (signals.simMcc) {
                const prefix = signals.simMcc.substring(0, 3);
                const country = MCC_COUNTRY[prefix];
                if (country)
                    candidates.push({ country, source: 'sim', weight: 4 });
            }
            // IP geolocation (weight reduced if VPN/proxy detected)
            if (ipData === null || ipData === void 0 ? void 0 : ipData.country_code) {
                candidates.push({
                    country: ipData.country_code,
                    source: 'ip',
                    weight: vpnFlagged ? 1 : 3,
                });
            }
            // IANA timezone
            if (signals.timezone) {
                const country = TZ_COUNTRY[signals.timezone];
                if (country)
                    candidates.push({ country, source: 'timezone', weight: 2 });
            }
            // Device locale
            if (signals.locale) {
                const country = this.countryFromLocale(signals.locale);
                if (country)
                    candidates.push({ country, source: 'locale', weight: 1 });
            }
            // Tally weighted votes
            const tally = {};
            for (const c of candidates) {
                tally[c.country] = (tally[c.country] || 0) + c.weight;
            }
            const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
            const winnerCountry = (_e = (_d = sorted[0]) === null || _d === void 0 ? void 0 : _d[0]) !== null && _e !== void 0 ? _e : 'US';
            const winningSources = candidates
                .filter(c => c.country === winnerCountry)
                .map(c => c.source);
            const detectedVia = winningSources.length > 0 ? winningSources.join('+') : 'fallback';
            const currency = (_f = COUNTRY_CURRENCY[winnerCountry]) !== null && _f !== void 0 ? _f : 'usd';
            // Resolve locale: use client's locale only if it actually matches the winner country
            let locale = (_g = signals.locale) !== null && _g !== void 0 ? _g : null;
            if (!locale || !((_h = this.countryFromLocale(locale)) === null || _h === void 0 ? void 0 : _h.includes(winnerCountry))) {
                const lang = (_l = (_k = (_j = ipData === null || ipData === void 0 ? void 0 : ipData.languages) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k.code) !== null && _l !== void 0 ? _l : 'en';
                locale = `${lang}-${winnerCountry}`;
            }
            return { country: winnerCountry, currency, locale, vpnFlagged, detectedVia };
        });
    }
}
exports.geoService = new GeoService();
//# sourceMappingURL=geo.service.js.map