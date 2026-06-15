import type { Request, Response, NextFunction } from "express";

/**
 * Wrap an async route handler so rejected promises forward to Express error
 * middleware instead of crashing the process.
 *
 * @param fn - Async route handler
 * @returns A request handler that forwards uncaught rejections to `next(err)`
 * @example
 * router.get("/users", asyncHandler(async (req, res) => {
 *   const users = await db.user.findMany();
 *   success(res, users);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
