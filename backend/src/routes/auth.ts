import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../lib/http";
import { AppRole, requireAuth, signToken } from "../middleware/auth";

export const authRouter = Router();

function publicRole(role: string): AppRole {
  if (role === "ADMIN" || role === "MANAGER" || role === "CLOSER") return role;
  return "CLOSER";
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) throw new HttpError(401, "Invalid email or password");
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Invalid email or password");

    const role = publicRole(user.role);
    const token = signToken({ id: user.id, role, email: user.email, name: user.name });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role },
    });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    if (!user || !user.active) throw new HttpError(401, "Account disabled");
    const role = publicRole(user.role);
    res.json({ user: { ...user, role } });
  })
);

const profileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
});

authRouter.patch(
  "/profile",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.body && typeof req.body === "object" && "password" in req.body) {
      throw new HttpError(403, "Passwords are managed by an admin");
    }
    const data = profileSchema.parse(req.body);
    if (!data.name && !data.email) throw new HttpError(400, "Enter a username to update");
    const email = data.email?.toLowerCase();
    if (email) {
      const taken = await prisma.user.findFirst({
        where: { email, NOT: { id: req.user!.id } },
        select: { id: true },
      });
      if (taken) throw new HttpError(409, "That username is already in use");
    }
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(email ? { email } : {}),
      },
      select: { id: true, name: true, email: true, role: true },
    });
    const role = publicRole(user.role);
    const token = signToken({ id: user.id, role, email: user.email, name: user.name });
    res.json({ token, user: { ...user, role } });
  })
);
