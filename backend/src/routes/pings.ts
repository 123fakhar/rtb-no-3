import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/http";
import { requireAuth } from "../middleware/auth";
import { executePing } from "../services/ping";

export const pingsRouter = Router();

pingsRouter.use(requireAuth);

/**
 * Trigger a single ping for a specific lead and RTB configuration.
 */
pingsRouter.post(
  "/leads/:leadId/ping/:configId",
  asyncHandler(async (req, res) => {
    const { leadId, configId } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { campaign: true },
    });
    if (!lead) throw new HttpError(404, "Lead not found");

    const rtbConfig = await prisma.rtbConfig.findUnique({
      where: { id: configId },
      include: { buyer: true, campaign: true },
    });
    if (!rtbConfig) throw new HttpError(404, "RTB Configuration not found");

    const ping = await executePing({
      lead,
      rtbConfig,
      agentId: req.user!.id,
    });

    res.status(201).json({
      ping: {
        id: ping.id,
        leadId: ping.leadId,
        buyerId: ping.buyerId,
        buyerName: ping.buyer?.name,
        campaignName: ping.config?.campaign?.name ?? lead.campaign?.name,
        configName: ping.config?.name,
        status: ping.status,
        bid: ping.bid ? Number(ping.bid) : null,
        trackingNumber: ping.trackingNumber,
        rejectReason: ping.rejectReason,
        durationMs: ping.durationMs,
        createdAt: ping.createdAt.toISOString(),
      },
    });
  })
);

/**
 * Batch ping multiple buyer configs simultaneously!
 */
const batchPingSchema = z.object({
  configIds: z.array(z.string().min(1)).min(1).max(20),
});

pingsRouter.post(
  "/leads/:leadId/ping-batch",
  asyncHandler(async (req, res) => {
    const { leadId } = req.params;
    const { configIds } = batchPingSchema.parse(req.body);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { campaign: true },
    });
    if (!lead) throw new HttpError(404, "Lead not found");

    const configs = await prisma.rtbConfig.findMany({
      where: { id: { in: configIds }, status: "ENABLED" },
      include: { buyer: true, campaign: true },
    });

    // Execute concurrently
    const pingPromises = configs.map((rtbConfig) =>
      executePing({
        lead,
        rtbConfig,
        agentId: req.user!.id,
      })
    );

    const settled = await Promise.allSettled(pingPromises);

    const results = settled.map((outcome, idx) => {
      const config = configs[idx];
      if (outcome.status === "fulfilled") {
        const p = outcome.value;
        return {
          id: p.id,
          configId: p.configId,
          buyerId: p.buyerId,
          buyerName: p.buyer?.name,
          campaignName: p.config?.campaign?.name ?? lead.campaign?.name,
          configName: p.config?.name,
          status: p.status,
          bid: p.bid ? Number(p.bid) : null,
          trackingNumber: p.trackingNumber,
          rejectReason: p.rejectReason,
          durationMs: p.durationMs,
          createdAt: p.createdAt.toISOString(),
        };
      } else {
        return {
          id: `err-${idx}`,
          configId: config.id,
          buyerId: config.buyerId,
          buyerName: config.buyer?.name,
          campaignName: config.campaign?.name,
          configName: config.name,
          status: "ERROR",
          bid: null,
          trackingNumber: null,
          rejectReason: outcome.reason?.message ?? "Execution failed",
          code: outcome.reason?.code ?? null,
          durationMs: 0,
          createdAt: new Date().toISOString(),
        };
      }
    });

    res.status(200).json({ results });
  })
);

/**
 * Get single ping details including raw response for modal view.
 */
pingsRouter.get(
  "/pings/:id",
  asyncHandler(async (req, res) => {
    const ping = await prisma.ping.findUnique({
      where: { id: req.params.id },
      include: {
        buyer: true,
        config: { include: { campaign: true } },
        lead: true,
      },
    });
    if (!ping) throw new HttpError(404, "Ping not found");

    res.json({
      ping: {
        id: ping.id,
        leadId: ping.leadId,
        buyerId: ping.buyerId,
        buyerName: ping.buyer?.name ?? "Buyer",
        campaignName: ping.config?.campaign?.name ?? ping.lead?.campaignId ?? "Auto Insurance",
        configName: ping.config?.name ?? "Configuration",
        status: ping.status,
        bid: ping.bid ? Number(ping.bid) : null,
        trackingNumber: ping.trackingNumber,
        rejectReason: ping.rejectReason,
        requestUrl: ping.requestUrl,
        requestBody: ping.requestBody,
        responseBody: ping.responseBody,
        httpStatus: ping.httpStatus,
        durationMs: ping.durationMs,
        createdAt: ping.createdAt.toISOString(),
      },
    });
  })
);

/**
 * List all pings / transactions for RTB Transactions admin view.
 */
pingsRouter.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)));
    const skip = (page - 1) * limit;

    const status = typeof req.query.status === "string" ? req.query.status.toUpperCase() : undefined;
    const buyerId = typeof req.query.buyerId === "string" ? req.query.buyerId : undefined;

    const where: Prisma.PingWhereInput = {
      ...(status && ["RESERVED", "REJECTED", "ERROR", "PENDING"].includes(status)
        ? { status: status as "RESERVED" | "REJECTED" | "ERROR" | "PENDING" }
        : {}),
      ...(buyerId ? { buyerId } : {}),
    };

    const [total, pings] = await Promise.all([
      prisma.ping.count({ where }),
      prisma.ping.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          buyer: { select: { id: true, name: true, provider: true } },
          config: { select: { id: true, name: true, campaign: { select: { name: true } } } },
          lead: { select: { id: true, phone: true, state: true } },
        },
      }),
    ]);

    res.json({
      transactions: pings.map((p) => ({
        id: p.id,
        leadId: p.leadId,
        leadPhone: p.lead ? p.lead.phone : "—",
        leadState: p.lead ? p.lead.state : "—",
        buyerName: p.buyer?.name ?? "—",
        buyerProvider: p.buyer?.provider ?? "—",
        configName: p.config?.name ?? "—",
        campaignName: p.config?.campaign?.name ?? "—",
        status: p.status,
        bid: p.bid ? Number(p.bid) : null,
        trackingNumber: p.trackingNumber,
        rejectReason: p.rejectReason,
        durationMs: p.durationMs,
        httpStatus: p.httpStatus,
        createdAt: p.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);
