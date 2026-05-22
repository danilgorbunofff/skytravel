import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const err = new Error(issue.message);
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
      const issue = result.error.issues[0];
      const err = new Error(issue.message);
      err.name = "ZodError";
      (err as Error & { status: number }).status = 400;
      next(err);
      return;
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
