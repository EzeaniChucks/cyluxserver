"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
require("dotenv/config"); // Must be first — loads env vars before any module reads process.env
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./database");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const child_routes_1 = __importDefault(require("./routes/child.routes"));
const alert_routes_1 = __importDefault(require("./routes/alert.routes"));
const parent_routes_1 = __importDefault(require("./routes/parent.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const geofence_routes_1 = __importDefault(require("./routes/geofence.routes"));
const vpn_routes_1 = __importDefault(require("./routes/vpn.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const influencer_routes_1 = __importDefault(require("./routes/influencer.routes"));
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
const smartDevice_routes_1 = __importDefault(require("./routes/smartDevice.routes"));
const subscription_controller_1 = require("./controllers/subscription.controller");
const logger_1 = require("./middlewares/logger");
const error_1 = require("./middlewares/error");
const rateLimiter_1 = require("./middlewares/rateLimiter");
const child_service_1 = require("./services/child.service");
const wallet_service_1 = require("./services/wallet.service");
const response_1 = require("./utils/response");
const plans_1 = require("./config/plans");
const app = (0, express_1.default)();
// Security headers (must be first)
app.use((0, helmet_1.default)());
// ── Stripe webhooks: MUST be registered before express.json() ────────────
// Stripe requires the raw request body to verify webhook signatures.
app.post("/api/subscription/webhook", express_1.default.raw({ type: "application/json" }), subscription_controller_1.subscriptionController.webhook);
// Stripe Connect webhook — fires on account.updated (onboarding complete)
app.post("/api/wallet/connect/webhook", express_1.default.raw({ type: "application/json" }), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET_CONNECT;
    if (!secret)
        return res.sendStatus(200); // Not configured — ignore
    let event;
    try {
        const Stripe = (yield Promise.resolve().then(() => __importStar(require("stripe")))).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
            apiVersion: "2024-06-20",
        });
        event = stripe.webhooks.constructEvent(req.body, sig, secret);
    }
    catch (_a) {
        return res.status(400).send("Webhook signature verification failed");
    }
    if (event.type === "account.updated") {
        yield wallet_service_1.walletService.handleConnectAccountUpdated(event.data.object.id).catch(console.error);
    }
    res.sendStatus(200);
}));
// CORS — origins from environment variable
const rawOrigins = process.env.CORS_ORIGINS;
let allowedOrigins;
if (rawOrigins) {
    allowedOrigins = rawOrigins
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
}
else if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: CORS_ORIGINS must be set in production environment");
}
else {
    // Development fallback
    allowedOrigins = [
        "http://localhost:3001",
        "http://10.0.2.2:3001",
        "http://localhost:3000",
        "http://10.0.2.2:3000",
    ];
}
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
app.use(express_1.default.json());
app.use(logger_1.requestLogger);
// Global rate limiter on all API routes
app.use("/api", rateLimiter_1.globalLimiter);
app.get("/api/health", (req, res) => {
    return response_1.ApiResponse.success(res, { status: "ok" });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/parent", parent_routes_1.default);
app.use("/api/children", child_routes_1.default);
app.use("/api/notifications", notification_routes_1.default);
app.use("/api/alerts", alert_routes_1.default);
app.use("/api/geofence", geofence_routes_1.default);
app.use("/api/vpn", vpn_routes_1.default);
app.use("/api/subscription", subscription_routes_1.default);
app.use("/api/admin", admin_routes_1.default);
app.use("/api/influencer", influencer_routes_1.default);
app.use("/api/wallet", wallet_routes_1.default);
app.use("/api/smart-devices", smartDevice_routes_1.default);
app.use(error_1.errorHandler);
const startBackgroundTasks = () => {
    const childService = new child_service_1.ChildService();
    // Device integrity check — every 60s
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { markedOffline, recovered } = yield childService.checkIntegrity();
            if (markedOffline > 0 || recovered > 0) {
                console.log(`[IntegrityTask] Scan complete — markedOffline: ${markedOffline}, recovered: ${recovered}`);
            }
        }
        catch (e) {
            console.error("[IntegrityTask] Pulse failed:", e instanceof Error ? e.message : e);
        }
    }), 60000);
    // Wallet hold release — every hour; moves pending credits to available balance
    setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const released = yield wallet_service_1.walletService.releaseHeldFunds();
            if (released > 0) {
                console.log(`[WalletTask] Released ${released} held transaction(s) to available balance`);
            }
        }
        catch (e) {
            console.error("[WalletTask] Hold release failed:", e instanceof Error ? e.message : e);
        }
    }), 60 * 60 * 1000);
};
database_1.AppDataSource.initialize()
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Database connected");
    yield (0, plans_1.seedPlanConfigs)();
    startBackgroundTasks();
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Guardian Backend Suite Active on ${PORT}`);
    });
}))
    .catch((error) => {
    console.error("Database connection error:", error);
    process.exit(1); // Don't start server without DB in production
});
//# sourceMappingURL=index.js.map