import "dotenv/config"; // Must be first — loads env vars before any module reads process.env
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { AppDataSource } from "./database";
import authRoutes from "./routes/auth.routes";
import childRoutes from "./routes/child.routes";
import alertRoutes from "./routes/alert.routes";
import parentRoutes from "./routes/parent.routes";
import notificationRoutes from "./routes/notification.routes";
import geofenceRoutes from "./routes/geofence.routes";
import vpnRoutes from "./routes/vpn.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import adminRoutes from "./routes/admin.routes";
import influencerRoutes from "./routes/influencer.routes";
import walletRoutes from "./routes/wallet.routes";
import smartDeviceRoutes from "./routes/smartDevice.routes";
import networkRoutes from "./routes/network.routes";
import blogRoutes from "./routes/blog.routes";
import aiRoutes from "./routes/ai.routes";
import { subscriptionController } from "./controllers/subscription.controller";
import { requestLogger } from "./middlewares/logger";
import { errorHandler } from "./middlewares/error";
import { globalLimiter } from "./middlewares/rateLimiter";
import { ChildService } from "./services/child.service";
import { walletService } from "./services/wallet.service";
import { ApiResponse } from "./utils/response";
import { seedPlanConfigs } from "./config/plans";
import { seedBlogPosts } from "./seeds/blogSeed";

const app = express();

// Security headers (must be first)
app.use(helmet());

// ── Stripe webhooks: MUST be registered before express.json() ────────────
// Stripe requires the raw request body to verify webhook signatures.
app.post(
  "/api/subscription/webhook",
  express.raw({ type: "application/json" }),
  subscriptionController.webhook
);

// Stripe Connect webhook — fires on account.updated (onboarding complete)
app.post(
  "/api/wallet/connect/webhook",
  express.raw({ type: "application/json" }),
  async (req: any, res: any) => {
    const sig = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET_CONNECT;
    if (!secret) return res.sendStatus(200); // Not configured — ignore

    let event: any;
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
        apiVersion: "2024-06-20" as any,
      });
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch {
      return res.status(400).send("Webhook signature verification failed");
    }

    if (event.type === "account.updated") {
      await walletService.handleConnectAccountUpdated(event.data.object.id).catch(console.error);
    }

    res.sendStatus(200);
  }
);

// CORS — origins from environment variable
const rawOrigins = process.env.CORS_ORIGINS;
let allowedOrigins: string[];

if (rawOrigins) {
  allowedOrigins = rawOrigins
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
} else if (process.env.NODE_ENV === "production") {
  throw new Error("FATAL: CORS_ORIGINS must be set in production environment");
} else {
  // Development fallback
  allowedOrigins = [
    "http://localhost:3001",
    "http://10.0.2.2:3001",
    "http://localhost:3000",
    "http://10.0.2.2:3000",
  ];
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json() as any);
app.use(requestLogger);

// Global rate limiter on all API routes
app.use("/api", globalLimiter);

app.get("/api/health", (req: any, res: any) => {
  return ApiResponse.success(res, { status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/parent", parentRoutes);
app.use("/api/children", childRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/geofence", geofenceRoutes);
app.use("/api/vpn", vpnRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/influencer", influencerRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/smart-devices", smartDeviceRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/ai", aiRoutes);

app.use(errorHandler);

const startBackgroundTasks = () => {
  const childService = new ChildService();

  // Device integrity check — every 60s
  setInterval(async () => {
    try {
      const { markedOffline, recovered } = await childService.checkIntegrity();
      if (markedOffline > 0 || recovered > 0) {
        console.log(
          `[IntegrityTask] Scan complete — markedOffline: ${markedOffline}, recovered: ${recovered}`
        );
      }
    } catch (e) {
      console.error("[IntegrityTask] Pulse failed:", e instanceof Error ? e.message : e);
    }
  }, 60000);

  // Wallet hold release — every hour; moves pending credits to available balance
  setInterval(async () => {
    try {
      const released = await walletService.releaseHeldFunds();
      if (released > 0) {
        console.log(`[WalletTask] Released ${released} held transaction(s) to available balance`);
      }
    } catch (e) {
      console.error("[WalletTask] Hold release failed:", e instanceof Error ? e.message : e);
    }
  }, 60 * 60 * 1000);
};

AppDataSource.initialize()
  .then(async () => {
    console.log("Database connected");
    await seedPlanConfigs();
    await seedBlogPosts();
    startBackgroundTasks();
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Guardian Backend Suite Active on ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error);
    process.exit(1); // Don't start server without DB in production
  });
