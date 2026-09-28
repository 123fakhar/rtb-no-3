import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL", "postgresql://rtb:rtb@localhost:5432/rtb?schema=public"),
  jwtSecret: required("JWT_SECRET", "dev-only-secret-change-me"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@rtb.local",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "admin12345",
  seedAgentEmail: process.env.SEED_AGENT_EMAIL ?? "agent@rtb.local",
  seedAgentPassword: process.env.SEED_AGENT_PASSWORD ?? "agent12345",
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 12000),
};

export const isProd = config.nodeEnv === "production";
