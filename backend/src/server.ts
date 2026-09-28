import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config";
import { errorMiddleware } from "./lib/http";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { buyersRouter } from "./routes/buyers";
import { campaignsRouter } from "./routes/campaigns";
import { configsRouter } from "./routes/configs";
import { leadsRouter } from "./routes/leads";
import { pingsRouter } from "./routes/pings";
import { crmRouter } from "./routes/crm";
import { analyticsRouter } from "./routes/analytics";
import { prisma } from "./lib/prisma";

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, docker) or any configured origin
      if (!origin || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1") || origin === config.corsOrigin) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev/production with token auth
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

if (config.nodeEnv !== "test") {
  app.use(morgan("tiny"));
}

// Health check endpoint for Docker & VPS reverse proxy
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      database: "connected",
    });
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      timestamp: new Date().toISOString(),
      error: "Database disconnected",
    });
  }
});

// Mount modular API routers
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/buyers", buyersRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/configs", configsRouter);
app.use("/api/leads", leadsRouter);
app.use("/api", pingsRouter);
app.use("/api/crm", crmRouter);
app.use("/api/analytics", analyticsRouter);

// Centralized error handling
app.use(errorMiddleware);

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`🚀 RTB Portal API listening on http://0.0.0.0:${config.port}`);
});

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing HTTP server and database pool...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server...");
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});

export default app;
