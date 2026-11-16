import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/http";
import { requireAdmin, requireAuth, requireSalesAccess } from "../middleware/auth";

export const campaignsRouter = Router();

campaignsRouter.use(requireAuth);

const writeSchema = z.object({
  name: z.string().min(1).max(120),
  vertical: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  active: z.boolean().optional(),
  defaults: z.record(z.string()).optional(),
  team: z.boolean().optional(),
});

campaignsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.query.scope === "team") {
      const campaigns = await prisma.campaign.findMany({
        where: { team: true },
        orderBy: { name: "asc" },
        include: {
          children: { select: { id: true, name: true }, orderBy: { name: "asc" } },
          _count: { select: { members: true } },
        },
      });
      res.json({ campaigns });
      return;
    }
    const campaigns = await prisma.campaign.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { configs: true, leads: true } } },
    });
    res.json({ campaigns });
  })
);

campaignsRouter.post(
  "/",
  requireSalesAccess,
  asyncHandler(async (req, res) => {
    const data = writeSchema.parse(req.body);
    const campaign = await prisma.campaign.create({ data });
    res.status(201).json({ campaign });
  })
);

campaignsRouter.patch(
  "/:id",
  requireSalesAccess,
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

campaignsRouter.get(
  "/:id/members",
  requireSalesAccess,
  asyncHandler(async (req, res) => {
    const closers = await prisma.user.findMany({
      where: { role: { in: ["CLOSER", "AGENT"] } },
      select: { id: true, name: true, email: true, active: true },
      orderBy: { name: "asc" },
    });
    const members = await prisma.campaignMember.findMany({
      where: { campaignId: req.params.id },
      select: { userId: true, active: true },
    });
    const byUser = new Map(members.map((member) => [member.userId, member.active]));
    res.json({
      members: closers.map((closer) => ({
        ...closer,
        inCampaign: byUser.has(closer.id),
        active: byUser.get(closer.id) === true,
      })),
    });
  })
);

const memberSchema = z.object({ active: z.boolean() });

campaignsRouter.put(
  "/:id/members/:userId",
  requireSalesAccess,
  asyncHandler(async (req, res) => {
    const { active } = memberSchema.parse(req.body);
    const member = await prisma.campaignMember.upsert({
      where: { campaignId_userId: { campaignId: req.params.id, userId: req.params.userId } },
      update: { active },
      create: { campaignId: req.params.id, userId: req.params.userId, active },
    });
    res.json({ member });
  })
);
