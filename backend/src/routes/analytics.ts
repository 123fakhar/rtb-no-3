import { Router } from "express";
import { asyncHandler } from "../lib/http";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { agentPerformance, dashboard } from "../services/analytics";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

/**
 * GET /api/analytics/dashboard
 * RTB performance dashboard metrics (Revenue, Leads, Wins, Bid Requests, Buyer/Campaign breakdown).
 */
analyticsRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const range = typeof req.query.range === "string" ? req.query.range : "30d";
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;

    const from = new Date();
    from.setDate(from.getDate() - days);

    const data = await dashboard(from);
    res.json(data);
  })
);

/**
 * GET /api/analytics/agents
 * Performance metrics for each agent across RTB leads and CRM submissions.
 */
analyticsRouter.get(
  "/agents",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const data = await agentPerformance();
    res.json({ agents: data });
  })
);
