import { Router } from "express";
import { asyncHandler } from "../lib/http";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { agentPerformance, dashboard, performanceForUser } from "../services/analytics";

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

analyticsRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const to = parseDate(req.query.to, new Date());
    let from = parseDate(req.query.from, new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000));
    if (from > to) from = new Date(to.getTime() - 24 * 60 * 60 * 1000);

    const tzRaw = Number(req.query.tzOffset);
    const tzOffsetMin = Number.isFinite(tzRaw) ? tzRaw : 0;

    const data = await dashboard({
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
