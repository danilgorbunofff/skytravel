import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";

export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only issue CSRF tokens when there's already a session (authenticated)
  // or for non-safe methods that will need the token.
  // Avoids creating empty sessions for anonymous GET traffic.
  if (!req.session?.id && ["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  // Expose token to client via non-httpOnly cookie so JS can read it
  res.cookie("XSRF-TOKEN", req.session.csrfToken, {
    httpOnly: false, // must be readable by JS
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  next();
}

export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    next();
    return;
  }
  const token =
    (req.headers["x-xsrf-token"] as string | undefined) ||
    (req.headers["x-csrf-token"] as string | undefined);
  if (!token || token !== req.session.csrfToken) {
    res.status(403).json({ ok: false, error: { code: "CSRF_INVALID", message: "Invalid CSRF token" } });
    return;
  }
  next();
}
