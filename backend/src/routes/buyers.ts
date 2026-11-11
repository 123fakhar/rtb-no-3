import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const buyersRouter = Router();

buyersRouter.use(requireAuth);

const writeSchema = z.object({
  name: z.string().min(1, "Buyer name is required").max(120),
  company: z.string().max(200).optional().default(""),
  provider: z.string().max(60).default("unset"),
  priority: z.number().int().min(1).max(99999).optional().default(1),
  weight: z.number().int().min(0).max(100000).optional().default(100),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("ACTIVE"),
  notes: z.string().max(2000).optional().default(""),
});

buyersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    // Return all buyers ordered by priority ascending (1 = highest priority), then name
    const buyers = await prisma.buyer.findMany({
      orderBy: [{ priority: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { configs: true } },
        configs: {
          select: { id: true, name: true, provider: true, status: true, campaign: { select: { name: true } } },
        },
      },
    });
    res.json({ buyers });
  })
);

buyersRouter.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = writeSchema.parse(req.body);
    const buyer = await prisma.buyer.create({
      data,
      include: {
        _count: { select: { configs: true, pings: true } },
      },
    });
    res.status(201).json({ buyer });
  })
);

buyersRouter.patch(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = writeSchema.partial().parse(req.body);
    const buyer = await prisma.buyer.update({
      where: { id: req.params.id },
      data,
      include: {
        _count: { select: { configs: true, pings: true } },
        configs: { select: { id: true, name: true, provider: true, status: true } },
      },
    });
    res.json({ buyer });
  })
);

buyersRouter.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await prisma.buyer.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);
