import { Router } from "express";
import { asyncHandler } from "../lib/http";
import { canSeeRevenue, requireAdmin, requireAuth } from "../middleware/auth";
import { agentPerformance, dashboard, performanceForUser, type DashboardQuery } from "../services/analytics";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

/**
 * GET /api/analytics/dashboard
 * RTB performance dashboard metrics (Revenue, Leads, Wins, Bid Requests, Buyer/Campaign breakdown).
 */
function parseDate(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || !value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

const dashboardCache = new Map<string, { at: number; data: unknown }>();
const dashboardInflight = new Map<string, Promise<unknown>>();
const DASHBOARD_TTL_MS = 12_000;

function dashboardCacheKey(query: DashboardQuery) {
  const toBucket = Math.floor(query.to.getTime() / 15_000);
  return [
    query.from.toISOString(),
    String(toBucket),
    String(query.tzOffsetMin),
    query.campaignId ?? "",
    query.buyerId ?? "",
    query.provider ?? "",
    query.state ?? "",
  ].join("|");
}

function loadDashboard(query: DashboardQuery) {
  const key = dashboardCacheKey(query);
  const hit = dashboardCache.get(key);
  if (hit && Date.now() - hit.at < DASHBOARD_TTL_MS) return Promise.resolve(hit.data);
  const pending = dashboardInflight.get(key);
  if (pending) return pending;
  const promise = dashboard(query)
    .then((data) => {
      dashboardCache.set(key, { at: Date.now(), data });
      if (dashboardCache.size > 40) {
        const oldest = [...dashboardCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) dashboardCache.delete(oldest[0]);
      }
      return data;
    })
    .finally(() => dashboardInflight.delete(key));
  dashboardInflight.set(key, promise);
  return promise;
}

analyticsRouter.get(
  "/dashboard",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const to = parseDate(req.query.to, new Date());
    let from = parseDate(req.query.from, new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000));
    if (from > to) from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

    const tzRaw = Number(req.query.tzOffset);
    const tzOffsetMin = Number.isFinite(tzRaw) ? tzRaw : 0;

    const data = await loadDashboard({
      from,
      to,
      tzOffsetMin,
      campaignId: typeof req.query.campaignId === "string" && req.query.campaignId ? req.query.campaignId : undefined,
      buyerId: typeof req.query.buyerId === "string" && req.query.buyerId ? req.query.buyerId : undefined,
      provider: typeof req.query.provider === "string" && req.query.provider ? req.query.provider : undefined,
      state: typeof req.query.state === "string" && req.query.state ? req.query.state : undefined,
    });
    res.json(data);
  })
);

/**
 * GET /api/analytics/agents
 * Performance metrics for each agent across RTB leads and CRM submissions.
 */
analyticsRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const performance = await performanceForUser(req.user!.id);
    if (!performance) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!canSeeRevenue(req.user?.role)) {
      const { revenue: _revenue, ...safe } = performance;
      res.json({ performance: safe });
      return;
    }
    res.json({ performance });
  })
);

analyticsRouter.get(
  "/agents",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const data = await agentPerformance();
    res.json({ agents: data });
  })
);
