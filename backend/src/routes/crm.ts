import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/http";
import { isCloserRole, requireAdmin, requireAuth, requireSalesAccess } from "../middleware/auth";
import { periodStart, shiftKey, shiftParts } from "../lib/pkt";
import { entryWhen, isSalesBook, personKey, portalStatsWhere, recordedSaleWhere, rosterFromHistory } from "../lib/records";
import { phoneKey, syncLeadSale } from "../services/sale";
import { workbookFile } from "../services/excel";

export const crmRouter = Router();

crmRouter.use(requireAuth);

const createCrmSchema = z.object({
  fronterName: z.string().trim().min(1, "Agent name is required").max(120),
  closerName: z.string().trim().min(1, "Closer name is required").max(120),
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
  buyerId: z.string().min(1, "Buyer is required"),
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
    closerName: entry.closerName?.trim() || entry.agent?.name || "Closer",
    customerName: entry.customerName,
    // Closers see a masked phone. Managers and admins see the full number.
    customerNumber: isAdmin ? entry.customerNumber : maskCustomerNumber(entry.customerNumber),
    customerNumberMasked: maskCustomerNumber(entry.customerNumber),
    customerZip: entry.customerZip,
    customerEmail: entry.customerEmail,
    did: entry.did,
    campaignId: entry.campaignId,
    campaignName: entry.campaign?.name ?? "—",
    vertical: entry.campaign?.vertical ?? "—",
    buyerId: entry.buyerId ?? null,
    buyerName: entry.buyer?.name ?? "—",
    comment: entry.comment,
    status: entry.status,
    agentId: entry.agentId,
    agentName: entry.closerName?.trim() || entry.agent?.name || "Closer",
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
    const seeAll = isAdmin || req.user!.role === "MANAGER";
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 25)));
    const skip = (page - 1) * limit;

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const campaignId = typeof req.query.campaignId === "string" ? req.query.campaignId : undefined;
    const agentId = typeof req.query.agentId === "string" ? req.query.agentId : undefined;

    // Filter by agent for non-admin if viewing their own, or allow agent to see their submissions
    const agentFilter = !seeAll && req.query.all !== "true" ? req.user!.id : agentId;

    const where: Prisma.CrmEntryWhereInput = {
      OR: [
        { kind: "SALE", pingId: null },
        { kind: "SALE", pingId: { not: "sheet-import" } },
        { pingId: "sheet-import", status: "REJECTED" },
      ],
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
          buyer: { select: { id: true, name: true } },
          agent: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    res.json({
      entries: entries.map((e) => formatCrmEntry(e, seeAll)),
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
    const buyer = await prisma.buyer.findUnique({ where: { id: data.buyerId }, select: { id: true } });
    if (!buyer) throw new HttpError(400, "Choose a buyer for this sale");

    const key = phoneKey(data.customerNumber);
    const storedNumber = key.length >= 9 ? key : data.customerNumber;
    const leadMatches = key.length >= 9
      ? await prisma.lead.findMany({
          where: { phone: { contains: key.length > 10 ? key.slice(-10) : key } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, phone: true },
        })
      : [];
    const matchedLead = leadMatches.find((lead) => phoneKey(lead.phone) === key);

    const entry = await prisma.crmEntry.create({
      data: {
        fronterName: data.fronterName,
        closerName: data.closerName,
        customerName: data.customerName,
        customerNumber: storedNumber,
        customerZip: data.customerZip,
        customerEmail: data.customerEmail,
        did: data.did,
        campaignId: data.campaignId ?? null,
        buyerId: buyer.id,
        leadId: matchedLead?.id ?? null,
        comment: data.comment,
        kind: "SALE",
        status: "PENDING",
        agentId: req.user!.id,
      },
      include: {
        campaign: { select: { id: true, name: true, vertical: true } },
        buyer: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    const isAdmin = req.user!.role === "ADMIN" || req.user!.role === "MANAGER";
    res.status(201).json({
      entry: formatCrmEntry(entry, isAdmin),
    });
  })
);

/**
 * PATCH /api/crm/:id/buyer
 * Attach the buyer to a sale that was reviewed before a buyer was recorded.
 * An accepted or rejected row starts blocking that buyer as soon as this is saved.
 */
crmRouter.patch(
  "/:id/buyer",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { buyerId } = z.object({ buyerId: z.string().min(1, "Buyer is required") }).parse(req.body);
    const existing = await prisma.crmEntry.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "CRM Entry not found");

    const buyer = await prisma.buyer.findUnique({ where: { id: buyerId }, select: { id: true } });
    if (!buyer) throw new HttpError(400, "Choose a buyer for this sale");

    let leadId = existing.leadId;
    if (!leadId) {
      const key = phoneKey(existing.customerNumber);
      if (key.length >= 9) {
        const matches = await prisma.lead.findMany({
          where: { phone: { contains: key.length > 10 ? key.slice(-10) : key } },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, phone: true },
        });
        leadId = matches.find((lead) => phoneKey(lead.phone) === key)?.id ?? null;
      }
    }

    const updated = await prisma.crmEntry.update({
      where: { id: existing.id },
      data: { buyerId: buyer.id, leadId },
      include: {
        campaign: { select: { id: true, name: true, vertical: true } },
        buyer: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });
    if (leadId && (existing.status === "APPROVED" || existing.status === "REJECTED")) {
      await syncLeadSale(leadId);
    }
    res.json({ entry: formatCrmEntry(updated, true) });
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
    if (!existing.buyerId) {
      throw new HttpError(400, "Choose the buyer before accepting or rejecting this sale");
    }

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
        buyer: { select: { id: true, name: true } },
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
function rangeStart(range: string, _tzOffsetMin: number) {
  return periodStart(range === "week" || range === "month" ? range : "day");
}

crmRouter.get(
  "/sales-stats",
  requireSalesAccess,
  asyncHandler(async (_req, res) => {
    const range = typeof _req.query.range === "string" ? _req.query.range : "all";
    const tzRaw = Number(_req.query.tzOffset);
    const tzOffsetMin = Number.isFinite(tzRaw) ? tzRaw : 0;
    const from = range === "day" || range === "week" || range === "month" ? rangeStart(range, tzOffsetMin) : null;
    const allEntries = await prisma.crmEntry.findMany({
      where: portalStatsWhere(null),
      select: {
        fronterName: true,
        closerName: true,
        status: true,
        buyerId: true,
        pingId: true,
        createdAt: true,
        reportedAt: true,
        agentId: true,
      },
    });
    const entries = from ? allEntries.filter((entry) => {
      const when = entryWhen(entry);
      return when != null && when >= from;
    }) : allEntries;
    const roster = rosterFromHistory(allEntries);
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let sold = 0;
    for (const entry of entries) {
      if (isSalesBook(entry)) {
        sold += 1;
        approved += 1;
        continue;
      }
      if (entry.status === "PENDING") pending += 1;
      else if (entry.status === "APPROVED") {
        approved += 1;
        sold += 1;
      } else if (entry.status === "REJECTED") rejected += 1;
    }
    const submittedLeads = await prisma.lead.count({
      where: from ? { createdAt: { gte: from } } : {},
    });
    const leads = entries.length + submittedLeads;
    res.json({
      agents: roster.agents,
      closers: roster.closers,
      summary: {
        leads,
        sold,
        conversion: leads > 0 ? Math.round((sold / leads) * 1000) / 10 : 0,
        pending,
        approved,
        rejected,
      },
    });
  })
);

function exportRange(req: { query: { range?: unknown; tzOffset?: unknown } }) {
  const range = req.query.range === "week" || req.query.range === "month" || req.query.range === "all" ? String(req.query.range) : "day";
  const tzRaw = Number(req.query.tzOffset);
  const tzOffsetMin = Number.isFinite(tzRaw) ? tzRaw : 0;
  const from = range === "all" ? null : rangeStart(range, tzOffsetMin);
  return { range, from };
}

crmRouter.get(
  "/export",
  requireSalesAccess,
  asyncHandler(async (req, res) => {
    const { range, from } = exportRange(req);
    const entries = await prisma.crmEntry.findMany({
      where: { AND: [recordedSaleWhere, ...(from ? [{ createdAt: { gte: from } }] : [])] },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: { select: { name: true } },
        buyer: { select: { name: true } },
        agent: { select: { name: true, email: true } },
      },
    });

    const rows = entries.map((entry) => [
      entry.createdAt.toISOString(),
      entry.status,
      entry.fronterName,
      entry.closerName?.trim() || entry.agent?.name || "",
      entry.agent?.email ?? "",
      entry.customerName,
      entry.customerNumber,
      entry.customerZip,
      entry.customerEmail,
      entry.did,
      entry.campaign?.name ?? "",
      entry.buyer?.name ?? "",
      entry.comment,
    ]);
    const file = await workbookFile(`sales-${range}.xlsx`, [
      "Date",
      "Status",
      "Agent Name",
      "Closer",
      "Closer Email",
      "Customer",
      "Phone",
      "ZIP",
      "Email",
      "DID",
      "Campaign",
      "Buyer",
      "Comment",
    ], rows);
    res.json({ ...file, count: entries.length });
  })
);

const noPickupSchema = z.object({
  phone: z.string().trim().min(7).max(25),
  campaignId: z.string().min(1, "Campaign is required"),
  buyerId: z.string().min(1, "Buyer is required"),
  reason: z.string().trim().min(1, "Reason is required").max(2000),
  agentName: z.string().trim().min(1, "Agent name is required").max(120),
  closerName: z.string().trim().min(1, "Closer name is required").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
});

function reportedDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function dateLabel(value: Date) {
  return value.toISOString().slice(0, 10);
}

crmRouter.post(
  "/no-pickup",
  asyncHandler(async (req, res) => {
    const data = noPickupSchema.parse(req.body);
    const key = phoneKey(data.phone);
    if (key.length !== 10) throw new HttpError(400, "Enter a 10-digit phone number");
    const [buyer, campaign] = await Promise.all([
      prisma.buyer.findUnique({ where: { id: data.buyerId }, select: { id: true, name: true } }),
      prisma.campaign.findUnique({ where: { id: data.campaignId }, select: { id: true, name: true } }),
    ]);
    if (!buyer) throw new HttpError(400, "Choose the buyer that did not pick up");
    if (!campaign) throw new HttpError(400, "Choose a campaign");

    const leadMatches = await prisma.lead.findMany({
      where: { phone: { contains: key } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, phone: true },
    });
    const matchedLead = leadMatches.find((lead) => phoneKey(lead.phone) === key);

    const entry = await prisma.crmEntry.create({
      data: {
        fronterName: data.agentName,
        closerName: data.closerName,
        customerName: "No pickup",
        customerNumber: key,
        customerZip: "",
        campaignId: campaign.id,
        buyerId: buyer.id,
        leadId: matchedLead?.id ?? null,
        comment: data.reason,
        kind: "NO_PICKUP",
        reportedAt: reportedDate(data.date),
        status: "REJECTED",
        reviewedAt: new Date(),
        agentId: req.user!.id,
      },
      include: {
        campaign: { select: { name: true } },
        buyer: { select: { name: true } },
        agent: { select: { name: true, email: true } },
      },
    });

    res.status(201).json({
      entry: {
        id: entry.id,
        phone: req.user!.role === "CLOSER" ? maskCustomerNumber(entry.customerNumber) : entry.customerNumber,
        campaign: entry.campaign?.name ?? "",
        buyer: entry.buyer?.name ?? "",
        reason: entry.comment,
        agentName: entry.fronterName,
        closerName: entry.closerName,
        date: entry.reportedAt ? dateLabel(entry.reportedAt) : data.date,
      },
    });
  })
);

crmRouter.get(
  "/no-pickup",
  asyncHandler(async (req, res) => {
    const seeAll = req.user!.role === "ADMIN" || req.user!.role === "MANAGER";
    const entries = await prisma.crmEntry.findMany({
      where: { kind: "NO_PICKUP", ...(seeAll ? {} : { agentId: req.user!.id }) },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        campaign: { select: { name: true } },
        buyer: { select: { name: true } },
      },
    });
    res.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        phone: seeAll ? entry.customerNumber : maskCustomerNumber(entry.customerNumber),
        campaign: entry.campaign?.name ?? "",
        buyer: entry.buyer?.name ?? "",
        reason: entry.comment,
        agentName: entry.fronterName,
        closerName: entry.closerName?.trim() || "",
        date: entry.reportedAt ? dateLabel(entry.reportedAt) : entry.createdAt.toISOString().slice(0, 10),
        createdAt: entry.createdAt.toISOString(),
      })),
    });
  })
);

crmRouter.get(
  "/no-pickup/export",
  requireSalesAccess,
  asyncHandler(async (req, res) => {
    const { range, from } = exportRange(req);
    const entries = await prisma.crmEntry.findMany({
      where: { kind: "NO_PICKUP", ...(from ? { reportedAt: { gte: from } } : {}) },
      orderBy: { reportedAt: "desc" },
      include: {
        campaign: { select: { name: true } },
        buyer: { select: { name: true } },
        agent: { select: { email: true } },
      },
    });
    const rows = entries.map((entry) => [
      entry.reportedAt ? dateLabel(entry.reportedAt) : entry.createdAt.toISOString().slice(0, 10),
      entry.customerNumber,
      entry.campaign?.name ?? "",
      entry.buyer?.name ?? "",
      entry.comment,
      entry.fronterName,
      entry.closerName?.trim() || entry.agent?.email || "",
    ]);
    const file = await workbookFile(`no-pickup-${range}.xlsx`, [
      "Date",
      "Phone",
      "Campaign",
      "Buyer",
      "Reason",
      "Agent Name",
      "Closer",
    ], rows);
    res.json({ ...file, count: entries.length });
  })
);

crmRouter.get(
  "/my-sales",
  asyncHandler(async (req, res) => {
    const range = req.query.range === "week" || req.query.range === "month" ? req.query.range : "day";
    const tzRaw = Number(req.query.tzOffset);
    const tzOffsetMin = Number.isFinite(tzRaw) ? tzRaw : 0;
    const from = rangeStart(range, tzOffsetMin);
    const me = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
    const mine: Prisma.CrmEntryWhereInput = {
      OR: [
        { agentId: req.user!.id },
        { closerName: { equals: me?.name || "__none__", mode: "insensitive" } },
        { fronterName: { equals: me?.name || "__none__", mode: "insensitive" } },
      ],
    };
    const entries = await prisma.crmEntry.findMany({
      where: {
        AND: [
          mine,
          {
            OR: [
              { kind: "SALE", OR: [{ pingId: null }, { pingId: { not: "sheet-import" } }], createdAt: { gte: from } },
              { pingId: "sheet-import", status: "REJECTED", reportedAt: { gte: from } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        campaign: { select: { name: true } },
        buyer: { select: { name: true } },
      },
    });
    const counts = { pending: 0, approved: 0, rejected: 0, total: entries.length };
    for (const entry of entries) {
      if (isSalesBook(entry)) counts.approved += 1;
      else if (entry.status === "PENDING") counts.pending += 1;
      else if (entry.status === "APPROVED") counts.approved += 1;
      else if (entry.status === "REJECTED") counts.rejected += 1;
    }
    res.json({
      range,
      ...counts,
      entries: entries.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt.toISOString(),
        status: entry.status,
        customerName: entry.customerName,
        phone: maskCustomerNumber(entry.customerNumber),
        buyer: entry.buyer?.name ?? "",
        campaign: entry.campaign?.name ?? "",
        agentName: entry.fronterName,
      })),
    });
  })
);

crmRouter.get(
  "/analytics",
  requireSalesAccess,
  asyncHandler(async (_req, res) => {
    const entries = await prisma.crmEntry.findMany({
      where: portalStatsWhere(null),
      select: { createdAt: true, reportedAt: true, status: true, buyerId: true, pingId: true, agentId: true, closerName: true, fronterName: true },
    });
    const roster = rosterFromHistory(entries);
    const people = new Map<string, { id: string; name: string; email: string; pending: number; approved: number; rejected: number; total: number; approvalRate: number }>();
    for (const row of [...roster.closers, ...roster.agents]) {
      const key = personKey(row.name);
      if (!people.has(key)) people.set(key, { id: key, ...row, approvalRate: 0 });
    }
    const totals = { total: 0, pending: 0, approved: 0, rejected: 0, approvalRate: 0 };
    const daysMap = new Map<string, { date: string; pending: number; approved: number; rejected: number; total: number }>();
    for (let i = 13; i >= 0; i -= 1) {
      const parts = shiftParts(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
      const dateKey = shiftKey(parts);
      daysMap.set(dateKey, { date: dateKey, pending: 0, approved: 0, rejected: 0, total: 0 });
    }

    for (const entry of entries) {
      const status = entry.status === "PENDING" ? "pending" : entry.status === "REJECTED" ? "rejected" : "approved";
      totals.total += 1;
      if (status === "pending") totals.pending += 1;
      if (status === "approved") totals.approved += 1;
      if (status === "rejected") totals.rejected += 1;
      const when = entry.pingId === "sheet-import" ? entry.reportedAt : entry.createdAt;
      if (!when) continue;
      const bucket = daysMap.get(shiftKey(shiftParts(when)));
      if (!bucket) continue;
      bucket.total += 1;
      if (status === "pending") bucket.pending += 1;
      if (status === "approved") bucket.approved += 1;
      if (status === "rejected") bucket.rejected += 1;
    }
    totals.approvalRate = totals.approved + totals.rejected > 0
      ? Math.round((totals.approved / (totals.approved + totals.rejected)) * 1000) / 10
      : 0;
    for (const person of people.values()) {
      const resolved = person.approved + person.rejected;
      person.approvalRate = resolved > 0 ? Math.round((person.approved / resolved) * 100) : 0;
    }

    res.json({
      totals,
      agentPerformance: [...people.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
      dailyTrend: [...daysMap.values()],
    });
  })
);

function localParts(date: Date, _tzOffsetMin: number) {
  return shiftParts(date);
}

function weekKey(parts: { year: number; month: number; day: number; weekday: number }) {
  const back = parts.weekday === 0 ? 6 : parts.weekday - 1;
  const monday = new Date(Date.UTC(parts.year, parts.month, parts.day - back));
  return monday.toISOString().slice(0, 10);
}

crmRouter.get(
  "/trends",
  asyncHandler(async (req, res) => {
    const tzRaw = Number(req.query.tzOffset);
    const tzOffsetMin = Number.isFinite(tzRaw) ? tzRaw : 0;
    const campaignId = typeof req.query.campaignId === "string" && req.query.campaignId ? req.query.campaignId : undefined;
    const did = typeof req.query.did === "string" && req.query.did ? req.query.did : undefined;
    const requestedUser = typeof req.query.userId === "string" && req.query.userId ? req.query.userId : undefined;
    const userId = isCloserRole(req.user!.role) ? req.user!.id : requestedUser;

    const where: Prisma.CrmEntryWhereInput = {
      AND: [
        recordedSaleWhere,
        ...(did ? [{ did }] : []),
        ...(userId
          ? [{
              OR: [
                { agentId: userId },
                {
                  closerName: {
                    equals: (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name || "__none__",
                    mode: "insensitive" as const,
                  },
                },
              ],
            }]
          : []),
      ],
    };
    if (campaignId) {
      const children = await prisma.campaign.findMany({ where: { parentId: campaignId }, select: { id: true } });
      where.campaignId = { in: [campaignId, ...children.map((child) => child.id)] };
    }

    const [entries, campaignRows, closers, didRows] = await Promise.all([
      prisma.crmEntry.findMany({
        where,
        select: { createdAt: true, status: true },
      }),
      prisma.campaign.findMany({ select: { id: true, name: true, team: true, parentId: true }, orderBy: { name: "asc" } }),
      isCloserRole(req.user!.role)
        ? Promise.resolve([])
        : prisma.user.findMany({
            where: { role: { in: ["CLOSER", "AGENT"] } },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          }),
      prisma.crmEntry.findMany({
        where: { AND: [recordedSaleWhere, { did: { not: "" } }, ...(userId ? [{ agentId: userId }] : [])] },
        distinct: ["did"],
        select: { did: true },
        take: 200,
      }),
    ]);

    const nowParts = localParts(new Date(), tzOffsetMin);
    const shift = (days: number, months = 0) => {
      const shifted = new Date(Date.UTC(nowParts.year, nowParts.month + months, nowParts.day + days));
      return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth(),
        day: shifted.getUTCDate(),
        weekday: shifted.getUTCDay(),
      };
    };
    const dayText = (parts: { year: number; month: number; day: number }) =>
      `${parts.year}-${String(parts.month + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    const todayKey = dayText(nowParts);
    const thisWeek = weekKey(nowParts);
    const thisMonth = `${nowParts.year}-${String(nowParts.month + 1).padStart(2, "0")}`;

    const dayMap = new Map<string, number>();
    const weekMap = new Map<string, number>();
    const monthMap = new Map<string, number>();
    for (let i = 13; i >= 0; i -= 1) dayMap.set(dayText(shift(-i)), 0);
    for (let i = 11; i >= 0; i -= 1) weekMap.set(weekKey(shift(-i * 7)), 0);
    for (let i = 11; i >= 0; i -= 1) {
      const parts = shift(0, -i);
      monthMap.set(`${parts.year}-${String(parts.month + 1).padStart(2, "0")}`, 0);
    }

    const totals = { day: 0, week: 0, month: 0, all: entries.length };
    for (const entry of entries) {
      const parts = localParts(entry.createdAt, tzOffsetMin);
      const day = dayText(parts);
      const week = weekKey(parts);
      const month = `${parts.year}-${String(parts.month + 1).padStart(2, "0")}`;
      if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) || 0) + 1);
      if (weekMap.has(week)) weekMap.set(week, (weekMap.get(week) || 0) + 1);
      if (monthMap.has(month)) monthMap.set(month, (monthMap.get(month) || 0) + 1);
      if (day === todayKey) totals.day += 1;
      if (week === thisWeek) totals.week += 1;
      if (month === thisMonth) totals.month += 1;
    }

    const labelDay = (key: string) => key.slice(5);
    const teams = campaignRows.filter((campaign) => campaign.team);
    const campaignOptions = teams.length
      ? teams.flatMap((team) => [
          { id: team.id, name: team.name },
          ...campaignRows
            .filter((campaign) => campaign.parentId === team.id)
            .map((campaign) => ({ id: campaign.id, name: `${team.name} · ${campaign.name}` })),
        ])
      : campaignRows.map((campaign) => ({ id: campaign.id, name: campaign.name }));
    res.json({
      totals,
      daily: [...dayMap.entries()].map(([label, sales]) => ({ label: labelDay(label), sales })),
      weekly: [...weekMap.entries()].map(([label, sales]) => ({ label: label.slice(5), sales })),
      monthly: [...monthMap.entries()].map(([label, sales]) => ({ label, sales })),
      campaigns: campaignOptions,
      closers,
      dids: didRows.map((row) => row.did).filter(Boolean).sort(),
    });
  })
);
