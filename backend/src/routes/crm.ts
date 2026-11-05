import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/http";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { syncLeadSale } from "../services/sale";

export const crmRouter = Router();

crmRouter.use(requireAuth);

const createCrmSchema = z.object({
  fronterName: z.string().trim().min(1, "Fronter's Name is required").max(120),
  customerName: z.string().trim().min(1, "Customer Name is required").max(120),
  customerNumber: z
    .string()
    .trim()
    .min(7, "Customer Number is required")
    .max(25),
  customerZip: z.string().trim().min(3, "Customer ZIP is required").max(15),
  customerEmail: z.string().trim().email().or(z.literal("")).default(""),
  did: z.string().trim().max(30).default(""),
  campaignId: z.string().min(1, "Campaign is required").nullable().optional(),
  comment: z.string().trim().max(2000).default(""),
});

const reviewCrmSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
  comment: z.string().trim().max(2000).optional(),
});

/**
 * Mask customer number for agents: first 3 digits hidden.
 * E.g.: "7314787322" -> "***4787322"
 * E.g.: "+1 731 478 7322" -> "*** 478 7322"
 */
function maskCustomerNumber(raw: string): string {
  const digitsOnly = raw.replace(/\D/g, "");
  if (digitsOnly.length <= 3) {
    return "***";
  }
  // Replace first 3 digit characters with ***
  let count = 0;
  return raw.replace(/\d/g, (match) => {
    count++;
    return count <= 3 ? "*" : match;
  });
}

function formatCrmEntry(entry: any, isAdmin: boolean) {
  return {
    id: entry.id,
    fronterName: entry.fronterName,
    customerName: entry.customerName,
    // Agent portal: first 3 numbers hidden. Admin portal: not hidden.
    customerNumber: isAdmin ? entry.customerNumber : maskCustomerNumber(entry.customerNumber),
    customerNumberMasked: maskCustomerNumber(entry.customerNumber),
    customerZip: entry.customerZip,
    customerEmail: entry.customerEmail,
    did: entry.did,
    campaignId: entry.campaignId,
    campaignName: entry.campaign?.name ?? "—",
    vertical: entry.campaign?.vertical ?? "—",
    comment: entry.comment,
    status: entry.status, // PENDING (yellow), APPROVED (green), REJECTED (red)
    agentId: entry.agentId,
    agentName: entry.agent?.name ?? "Agent",
    agentEmail: entry.agent?.email ?? "",
    reviewedById: entry.reviewedById,
    reviewedAt: entry.reviewedAt ? entry.reviewedAt.toISOString() : null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

/**
 * GET /api/crm
 * Returns CRM entries with search, status filter, agent filter, and pagination.
 */
crmRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.role === "ADMIN";
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
    const skip = (page - 1) * limit;

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const campaignId = typeof req.query.campaignId === "string" ? req.query.campaignId : undefined;
    const agentId = typeof req.query.agentId === "string" ? req.query.agentId : undefined;

    // Filter by agent for non-admin if viewing their own, or allow agent to see their submissions
    const agentFilter = !isAdmin && req.query.all !== "true" ? req.user!.id : agentId;

    const where: Prisma.CrmEntryWhereInput = {
      pingId: null,
      ...(agentFilter ? { agentId: agentFilter } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(status && ["PENDING", "APPROVED", "REJECTED"].includes(status)
        ? { status: status as "PENDING" | "APPROVED" | "REJECTED" }
        : {}),
      ...(search
        ? {
            OR: [
              { fronterName: { contains: search, mode: "insensitive" } },
              { customerName: { contains: search, mode: "insensitive" } },
              { customerNumber: { contains: search } },
              { customerZip: { contains: search } },
              { did: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, entries] = await Promise.all([
      prisma.crmEntry.count({ where }),
      prisma.crmEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          campaign: { select: { id: true, name: true, vertical: true } },
          agent: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    res.json({
      entries: entries.map((e) => formatCrmEntry(e, isAdmin)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * POST /api/crm
 * Submit a new CRM entry.
 */
crmRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createCrmSchema.parse(req.body);

    const entry = await prisma.crmEntry.create({
      data: {
        fronterName: data.fronterName,
        customerName: data.customerName,
        customerNumber: data.customerNumber,
        customerZip: data.customerZip,
        customerEmail: data.customerEmail,
        did: data.did,
        campaignId: data.campaignId ?? null,
        comment: data.comment,
        status: "PENDING", // Initial pending status (yellow)
        agentId: req.user!.id,
      },
      include: {
        campaign: { select: { id: true, name: true, vertical: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    const isAdmin = req.user!.role === "ADMIN";
    res.status(201).json({
      entry: formatCrmEntry(entry, isAdmin),
    });
  })
);

/**
 * PATCH /api/crm/:id/review
 * Admin approve or reject a CRM submission.
 */
crmRouter.patch(
  "/:id/review",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = reviewCrmSchema.parse(req.body);

    const existing = await prisma.crmEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "CRM Entry not found");

    const updated = await prisma.crmEntry.update({
      where: { id: req.params.id },
      data: {
        status: data.status,
        comment: data.comment ? data.comment : existing.comment,
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
      },
      include: {
        campaign: { select: { id: true, name: true, vertical: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    if (existing.leadId) await syncLeadSale(existing.leadId);

    res.json({ entry: formatCrmEntry(updated, true) });
  })
);

/**
 * GET /api/crm/analytics
 * Performance analytics of each agent, breakdown of submissions (pending, approved, rejected),
 * daily trend, and campaign distribution.
 */
crmRouter.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    const agents = await prisma.user.findMany({
      where: { role: "AGENT" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });

    const formOnly = { pingId: null };
    const [statusCounts, agentStats, campaignStats, dailyTrend] = await Promise.all([
      prisma.crmEntry.groupBy({
        by: ["status"],
        where: formOnly,
        _count: true,
      }),
      prisma.crmEntry.groupBy({
        by: ["agentId", "status"],
        where: formOnly,
        _count: true,
      }),
      prisma.crmEntry.groupBy({
        by: ["campaignId", "status"],
        where: formOnly,
        _count: true,
      }),
      prisma.crmEntry.findMany({
        where: {
          ...formOnly,
          createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
        select: { createdAt: true, status: true },
      }),
    ]);

    const totals = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      approvalRate: 0,
    };

    for (const s of statusCounts) {
      if (s.status === "PENDING") totals.pending = s._count;
      if (s.status === "APPROVED") totals.approved = s._count;
      if (s.status === "REJECTED") totals.rejected = s._count;
      totals.total += s._count;
    }
    totals.approvalRate =
      totals.total > 0 ? Math.round((totals.approved / (totals.approved + totals.rejected || 1)) * 1000) / 10 : 0;

    // Agent map
    const agentMap = new Map(
      agents.map((a) => [
        a.id,
        {
          id: a.id,
          name: a.name,
          email: a.email,
          pending: 0,
          approved: 0,
          rejected: 0,
          total: 0,
          approvalRate: 0,
        },
      ])
    );

    for (const row of agentStats) {
      const entry = agentMap.get(row.agentId);
      if (entry) {
        if (row.status === "PENDING") entry.pending += row._count;
        if (row.status === "APPROVED") entry.approved += row._count;
        if (row.status === "REJECTED") entry.rejected += row._count;
        entry.total += row._count;
      }
    }

    for (const entry of agentMap.values()) {
      const resolved = entry.approved + entry.rejected;
      entry.approvalRate = resolved > 0 ? Math.round((entry.approved / resolved) * 100) : 0;
    }

    // Daily buckets (last 14 days)
    const daysMap = new Map<string, { date: string; pending: number; approved: number; rejected: number; total: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      daysMap.set(dateKey, { date: dateKey, pending: 0, approved: 0, rejected: 0, total: 0 });
    }

    for (const entry of dailyTrend) {
      const dateKey = entry.createdAt.toISOString().slice(0, 10);
      const bucket = daysMap.get(dateKey);
      if (bucket) {
        bucket.total++;
        if (entry.status === "PENDING") bucket.pending++;
        if (entry.status === "APPROVED") bucket.approved++;
        if (entry.status === "REJECTED") bucket.rejected++;
      }
    }

    res.json({
      totals,
      agentPerformance: [...agentMap.values()].sort((a, b) => b.total - a.total),
      dailyTrend: [...daysMap.values()],
    });
  })
);
