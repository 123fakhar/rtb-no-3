import { ZodError } from "zod";
import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  const prismaCode = (err as { code?: string }).code;
  if (prismaCode === "P2002") {
    res.status(409).json({ error: "A record with that value already exists" });
    return;
  }
  if (prismaCode === "P2025") {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
