import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { HttpError } from "../lib/http";

export type AppRole = "ADMIN" | "MANAGER" | "CLOSER" | "AGENT";

export interface AuthUser {
  id: string;
  role: AppRole;
  email: string;
  name: string;
}

export function isCloserRole(role: string | undefined) {
  return role === "CLOSER" || role === "AGENT";
}

export function canSeeRevenue(role: string | undefined) {
  return role === "ADMIN";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Authentication required");
  }
  try {
    const user = jwt.verify(header.slice(7), config.jwtSecret) as AuthUser;
    if (user.role === "AGENT") user.role = "CLOSER";
    req.user = user;
    next();
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    throw new HttpError(403, "Admin access required");
  }
  next();
}

export function requireSalesAccess(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN" && req.user?.role !== "MANAGER") {
    throw new HttpError(403, "Manager or admin access required");
  }
  next();
}
