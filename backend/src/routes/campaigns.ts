import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth);

const writeSchema = z.object({
  name: z.string().min(1).max(120),
  vertical: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  active: z.boolean().optional(),
  defaults: z.record(z.string()).optional(),
});

campaignsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { configs: true, leads: true } } },
    });
    res.json({ campaigns });
  })
);

campaignsRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = writeSchema.parse(req.body);
    const campaign = await prisma.campaign.create({ data });
    res.status(201).json({ campaign });
  })
);

campaignsRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = writeSchema.partial().parse(req.body);
    const campaign = await prisma.campaign.update({ where: { id: req.params.id }, data });
    res.json({ campaign });
  })
);

campaignsRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);
