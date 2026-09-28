import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/http";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { listProviders } from "../providers";
import { previewUrl } from "../services/ping";

export const configsRouter = Router();

configsRouter.use(requireAuth);

const paramSchema = z.object({ key: z.string().min(1).max(120), value: z.string().max(2000) });

const writeSchema = z.object({
  name: z.string().min(1).max(160),
  buyerId: z.string().min(1),
  campaignId: z.string().min(1).nullable().optional(),
  provider: z.string().min(1).max(40),
  method: z.enum(["GET", "POST"]).optional(),
  mode: z.string().max(40).optional(),
  status: z.enum(["ENABLED", "DISABLED"]).optional(),
  baseUrl: z.string().max(2000).optional(),
  apiKey: z.string().max(2000).optional(),
  params: z.array(paramSchema).max(50).optional(),
  staticParams: z.record(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  extra: z.record(z.unknown()).optional(),
});

function maskKey(key: string): string {
  if (!key) return "—";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function computeBuiltUrl(config: any): string {
  try {
    const defaults = (config.campaign?.defaults as Record<string, string>) ?? {};
    return previewUrl(
      config,
      { phone: "{caller_number}", zip: "{caller_zip}", state: "{caller_state}" },
      defaults
    );
  } catch {
    return config.baseUrl || "";
  }
}

function present(config: any, isAdmin: boolean) {
  const successRate =
    config.totalCount > 0 ? (config.successCount / config.totalCount) * 100 : 0.0;

  return {
    id: config.id,
    name: config.name,
    buyerId: config.buyerId,
    buyer: config.buyer
      ? { id: config.buyer.id, name: config.buyer.name, priority: config.buyer.priority, status: config.buyer.status }
      : null,
    buyerName: config.buyer?.name ?? "—",
    campaignId: config.campaignId,
    campaign: config.campaign ? { id: config.campaign.id, name: config.campaign.name } : null,
    campaignName: config.campaign?.name ?? "—",
    provider: config.provider,
    method: config.method,
    mode: config.mode ?? "RTB",
    baseUrl: config.baseUrl,
    builtUrl: computeBuiltUrl(config),
    apiKey: isAdmin ? config.apiKey : undefined,
    apiKeyMasked: maskKey(config.apiKey),
    status: config.status,
    successCount: config.successCount,
    totalCount: config.totalCount,
    successRate: Math.round(successRate * 10) / 10,
    params: config.params,
    staticParams: config.staticParams,
    headers: config.headers,
    extra: config.extra,
    lastTestedAt: config.lastTestedAt ? config.lastTestedAt.toISOString() : null,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  };
}

configsRouter.get(
  "/providers",
  asyncHandler(async (_req, res) => {
    res.json({ providers: listProviders() });
  })
);

configsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.role === "ADMIN";
    const configs = await prisma.rtbConfig.findMany({
      orderBy: [{ buyer: { priority: "asc" } }, { name: "asc" }],
      include: { buyer: true, campaign: true },
    });
    res.json({ configs: configs.map((c) => present(c, isAdmin)) });
  })
);

configsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = writeSchema.parse(req.body);
    const config = await prisma.rtbConfig.create({
      data: {
        name: data.name,
        buyerId: data.buyerId,
        campaignId: data.campaignId ?? null,
        provider: data.provider,
        method: data.method ?? "GET",
        mode: data.mode ?? "RTB",
        status: data.status ?? "ENABLED",
        baseUrl: data.baseUrl ?? "",
        apiKey: data.apiKey ?? "",
        params: data.params ? (data.params as any) : [],
        staticParams: data.staticParams ? (data.staticParams as any) : {},
        headers: data.headers ? (data.headers as any) : {},
        extra: data.extra ? (data.extra as any) : {},
      },
      include: { buyer: true, campaign: true },
    });
    res.status(201).json({ config: present(config, true) });
  })
);

configsRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = writeSchema.partial().parse(req.body);
    const existing = await prisma.rtbConfig.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Configuration not found");

    const config = await prisma.rtbConfig.update({
      where: { id: req.params.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.buyerId ? { buyerId: data.buyerId } : {}),
        ...(data.campaignId !== undefined ? { campaignId: data.campaignId } : {}),
        ...(data.provider ? { provider: data.provider } : {}),
        ...(data.method ? { method: data.method } : {}),
        ...(data.mode ? { mode: data.mode } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.baseUrl !== undefined ? { baseUrl: data.baseUrl } : {}),
        ...(data.apiKey !== undefined && data.apiKey !== "" ? { apiKey: data.apiKey } : {}),
        ...(data.params !== undefined ? { params: data.params as any } : {}),
        ...(data.staticParams !== undefined ? { staticParams: data.staticParams as any } : {}),
        ...(data.headers !== undefined ? { headers: data.headers as any } : {}),
        ...(data.extra !== undefined ? { extra: data.extra as any } : {}),
      },
      include: { buyer: true, campaign: true },
    });
    res.json({ config: present(config, true) });
  })
);

configsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.rtbConfig.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);

configsRouter.post(
  "/preview",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = writeSchema.parse(req.body);
    const sample = { phone: "{caller_number}", zip: "{caller_zip}", state: "{caller_state}" };
    const defaults = data.campaignId
      ? ((await prisma.campaign.findUnique({ where: { id: data.campaignId } }))?.defaults as Record<string, string>) ?? {}
      : {};
    const url = previewUrl(
      {
        ...data,
        id: "preview",
        campaignId: data.campaignId ?? null,
        method: data.method ?? "GET",
        mode: data.mode ?? "RTB",
        status: "ENABLED",
        baseUrl: data.baseUrl ?? "",
        apiKey: data.apiKey ?? "",
        params: (data.params as any) ?? [],
        staticParams: (data.staticParams as any) ?? {},
        headers: (data.headers as any) ?? {},
        extra: (data.extra as any) ?? {},
        successCount: 0,
        totalCount: 0,
        lastTestedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      sample,
      defaults
    );
    res.json({ url });
  })
);
