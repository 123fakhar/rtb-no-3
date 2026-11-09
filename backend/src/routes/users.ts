import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { asyncHandler, HttpError } from "../lib/http";
import { requireAdmin, requireAuth, requireSalesAccess } from "../middleware/auth";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get(
  "/closers",
  requireSalesAccess,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { role: { in: ["CLOSER", "AGENT"] } },
      select: userSelect,
      orderBy: { name: "asc" },
    });
    res.json({ users });
  })
);

usersRouter.use(requireAdmin);

const userSelect = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;

usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const role = typeof req.query.role === "string" ? req.query.role : undefined;
    const users = await prisma.user.findMany({
      where:
        role === "CLOSER" || role === "AGENT" || role === "ADMIN" || role === "MANAGER" ? { role } : undefined,
      select: userSelect,
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  })
);

const createSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(["ADMIN", "MANAGER", "CLOSER"]).default("CLOSER"),
});

usersRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, config.bcryptRounds);
    const user = await prisma.user.create({
      data: { name: data.name, email: data.email.toLowerCase(), passwordHash, role: data.role },
      select: userSelect,
    });
    res.status(201).json({ user });
  })
);

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(["ADMIN", "MANAGER", "CLOSER"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id && req.body?.active === false) {
      throw new HttpError(400, "You cannot deactivate your own account");
    }
    const data = updateSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        role: data.role,
        active: data.active,
        passwordHash: data.password ? await bcrypt.hash(data.password, config.bcryptRounds) : undefined,
      },
      select: userSelect,
    });
    res.json({ user });
  })
);

usersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw new HttpError(400, "You cannot delete your own account");
    const [leads, crm] = await Promise.all([
      prisma.lead.count({ where: { agentId: req.params.id } }),
      prisma.crmEntry.count({ where: { agentId: req.params.id } }),
    ]);
    if (leads + crm > 0) {
      // Keep history intact: deactivate instead of destroying records.
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { active: false },
        select: userSelect,
      });
      res.json({ user, deactivated: true });
      return;
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);
