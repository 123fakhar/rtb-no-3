import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/http";
import { requireAuth } from "../middleware/auth";

export const leadsRouter = Router();

leadsRouter.use(requireAuth);

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 3) return "***";
  return `***${digits.slice(3)}`;
}

function visiblePhone(role: string | undefined, phone: string) {
  return role === "AGENT" ? maskPhone(phone) : phone;
}

const createLeadSchema = z.object({
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length === 10, { message: "Phone must be a valid 10-digit number" }),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(?:-\d{4})?$/, "ZIP must be a 5-digit code"),
  state: z
    .string()
    .trim()
    .min(2)
    .max(2)
    .transform((s) => s.toUpperCase()),
  campaignId: z.string().optional().nullable(),
});

leadsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
    const skip = (page - 1) * limit;

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const campaignId = typeof req.query.campaignId === "string" ? req.query.campaignId : undefined;

    // Filter by agent if requested or for non-admin if desired, but agents can view their own leads
    const agentFilter =
      req.user!.role === "AGENT" && req.query.all !== "true"
        ? req.user!.id
        : typeof req.query.agentId === "string"
        ? req.query.agentId
        : undefined;

    const where: Prisma.LeadWhereInput = {
      ...(agentFilter ? { agentId: agentFilter } : {}),
      ...(campaignId ? { campaignId } : {}),
      ...(status && ["SUBMITTED", "SOLD", "REJECTED"].includes(status)
        ? { status: status as "SUBMITTED" | "SOLD" | "REJECTED" }
        : {}),
      ...(search
        ? {
            OR: [
              { phone: { contains: search } },
              { zip: { contains: search } },
              { state: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          campaign: { select: { id: true, name: true, vertical: true } },
          agent: { select: { id: true, name: true, email: true } },
          _count: { select: { pings: true } },
        },
      }),
    ]);

    // Fetch buyer details for sold leads
    const buyerIds = [...new Set(leads.map((l) => l.buyerId).filter(Boolean) as string[])];
    const buyers = buyerIds.length
      ? await prisma.buyer.findMany({
          where: { id: { in: buyerIds } },
          select: { id: true, name: true },
        })
      : [];
    const buyerMap = new Map(buyers.map((b) => [b.id, b.name]));

    const formatted = leads.map((lead) => ({
      id: lead.id,
      phone: visiblePhone(req.user?.role, lead.phone),
      zip: lead.zip,
      state: lead.state,
      campaign: lead.campaign?.name ?? "—",
      campaignId: lead.campaignId,
      buyer: lead.buyerId ? buyerMap.get(lead.buyerId) ?? "Buyer" : "—",
      buyerId: lead.buyerId,
      revenue: Number(lead.revenue),
      score: lead.score,
      status: lead.status,
      agentName: lead.agent?.name ?? "Agent",
      agentId: lead.agentId,
      createdAt: lead.createdAt.toISOString(),
      pingsCount: lead._count.pings,
    }));

    res.json({
      leads: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

leadsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createLeadSchema.parse(req.body);

    // If campaignId wasn't passed, assign Auto Insurance default if exists
    let campaignId = data.campaignId;
    if (!campaignId) {
      const defaultCampaign = await prisma.campaign.findFirst({
        where: { active: true },
        orderBy: { name: "asc" },
      });
      campaignId = defaultCampaign?.id ?? null;
    }

    const lead = await prisma.lead.create({
      data: {
        phone: data.phone,
        zip: data.zip,
        state: data.state,
        campaignId,
        agentId: req.user!.id,
        score: 0,
        status: "SUBMITTED",
        revenue: 0,
      },
      include: {
        campaign: { select: { id: true, name: true, vertical: true } },
        agent: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      lead: {
        id: lead.id,
        phone: lead.phone,
        zip: lead.zip,
        state: lead.state,
        campaign: lead.campaign?.name ?? "—",
        campaignId: lead.campaignId,
        score: lead.score,
        status: lead.status,
        agentName: lead.agent?.name,
        createdAt: lead.createdAt.toISOString(),
      },
    });
  })
);

leadsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: true,
        agent: { select: { id: true, name: true, email: true } },
      },
    });
    if (!lead) throw new HttpError(404, "Lead not found");

    res.json({
      lead: {
        ...lead,
        phone: visiblePhone(req.user?.role, lead.phone),
      },
    });
  })
);

const updateLeadSchema = z.object({
  zip: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/, "ZIP must be a 5-digit code"),
  state: z
    .string()
    .trim()
    .min(2)
    .max(2)
    .transform((s) => s.toUpperCase())
    .optional(),
});

leadsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateLeadSchema.parse(req.body);
    const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Lead not found");
    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        zip: data.zip,
        ...(data.state ? { state: data.state } : {}),
      },
    });
    res.json({ lead: { id: lead.id, zip: lead.zip, state: lead.state } });
  })
);

/**
 * Routing view endpoint: returns the lead, all active buyers ordered by priority,
 * and their matching RTB configs + ping history for this lead.
 */
leadsRouter.get(
  "/:id/routing",
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: true,
        agent: { select: { id: true, name: true } },
      },
    });
    if (!lead) throw new HttpError(404, "Lead not found");

    // All active buyers sorted by priority ASC (lower number = higher priority), then name ASC
    const buyers = await prisma.buyer.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
      include: {
        configs: {
          where: { status: "ENABLED" },
          orderBy: { name: "asc" },
          include: { campaign: { select: { id: true, name: true } } },
        },
      },
    });

    // Recent routing history for this specific lead
    const [pings, approvedSales] = await Promise.all([
      prisma.ping.findMany({
        where: { leadId: lead.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          buyer: { select: { id: true, name: true, provider: true } },
          config: { select: { id: true, name: true, provider: true, campaign: { select: { id: true, name: true } } } },
        },
      }),
      prisma.crmEntry.findMany({
        where: { leadId: lead.id, status: "APPROVED", buyerId: { not: null } },
        select: { buyerId: true },
      }),
    ]);

    const formattedHistory = pings.map((p) => ({
      id: p.id,
      leadId: p.leadId,
      buyerId: p.buyerId,
      buyerName: p.buyer?.name ?? "Unknown Buyer",
      campaignName: p.config?.campaign?.name ?? lead.campaign?.name ?? "Campaign",
      configName: p.config?.name ?? "Config",
      provider: p.config?.provider ?? p.buyer?.provider ?? "rtb",
      status: p.status, // RESERVED, REJECTED, ERROR
      bid: p.bid ? Number(p.bid) : null,
      trackingNumber: p.trackingNumber,
      rejectReason: p.rejectReason,
      createdAt: p.createdAt.toISOString(),
      durationMs: p.durationMs,
    }));

    // Group buyer configs
    const groupedBuyers = buyers
      .map((b) => ({
        id: b.id,
        name: b.name,
        company: b.company,
        provider: b.provider,
        priority: b.priority,
        weight: b.weight,
        configs: b.configs.map((c) => ({
          id: c.id,
          name: c.name,
          provider: c.provider,
          campaignId: c.campaignId,
          campaignName: c.campaign?.name ?? "General",
          method: c.method,
          mode: c.mode,
          status: c.status,
          successRate: c.totalCount > 0 ? (c.successCount / c.totalCount) * 100 : 0,
        })),
      }))
      .filter((b) => b.configs.length > 0);

    res.json({
      lead: {
        id: lead.id,
        phone: visiblePhone(req.user?.role, lead.phone),
        zip: lead.zip,
        state: lead.state,
        campaign: lead.campaign?.name ?? "Auto Insurance",
        campaignId: lead.campaignId,
        status: lead.status,
        revenue: Number(lead.revenue),
        score: lead.score,
      },
      buyers: groupedBuyers,
      history: formattedHistory,
      soldBuyerIds: [...new Set(approvedSales.map((sale) => sale.buyerId).filter((id): id is string => Boolean(id)))],
    });
  })
);
