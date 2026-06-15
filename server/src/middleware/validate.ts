import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import type { ZodError } from "zod";

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const error = result.error as ZodError;
      const issue = error.issues?.[0] ?? error;
      const err = new Error(issue?.message || "Validation failed");
      err.name = "ZodError";
      (err as Error & { status: number }).status = 400;
      next(err);
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const error = result.error as ZodError;
      const issue = error.issues?.[0] ?? error;
      const err = new Error(issue?.message || "Validation failed");
      err.name = "ZodError";
      (err as Error & { status: number }).status = 400;
      next(err);
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
