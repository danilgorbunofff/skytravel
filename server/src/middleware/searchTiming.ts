import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

// Logs a single line per /api/search/* request with status, duration and
// response bytes. Also injects Server-Timing on successful responses so we
// can correlate browser-side measurements with server-side handler time.
//
// Full instrumentation (write/end patching + byte counting + Server-Timing)
// is only activated when ?timing=1 or x-debug: timing is present.  Otherwise
// a lightweight close listener logs just the duration.
export function searchTimingMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith("/api/search")) {
    next();
    return;
  }

  const start = process.hrtime.bigint();

  // Only do full instrumentation when explicitly requested
  const wantsTiming =
    req.query.timing === "1" || req.headers["x-debug"] === "timing";

  if (wantsTiming) {
    let bytes = 0;
    let closed = false;
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    const cleanup = (): void => {
      if (closed) return;
      closed = true;
      res.write = originalWrite;
      res.end = originalEnd;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.write = function patchedWrite(chunk: any, ...rest: any[]): boolean {
      if (chunk) bytes += Buffer.byteLength(typeof chunk === "string" ? chunk : chunk);
      return originalWrite(chunk, ...rest);
    } as typeof res.write;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.end = function patchedEnd(chunk?: any, ...rest: any[]): Response {
      if (chunk) bytes += Buffer.byteLength(typeof chunk === "string" ? chunk : chunk);
      const durMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const existing = res.getHeader("Server-Timing");
      const total = `total;dur=${durMs.toFixed(1)}`;
      if (!res.headersSent) {
        res.setHeader("Server-Timing", existing ? `${existing}, ${total}` : total);
      }
      const cache = (res.getHeader("X-Cache") as string | undefined) ?? "-";
      logger.info(
        `[search] ${req.method} ${req.originalUrl} ${res.statusCode} ${durMs.toFixed(1)}ms ${bytes}B cache=${cache}`,
      );
      cleanup();
      return originalEnd(chunk, ...rest);
    } as typeof res.end;

    res.on("close", () => {
      const durMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      logger.info(
        `[search] ${req.method} ${req.originalUrl} -(aborted) ${durMs.toFixed(1)}ms ${bytes}B`,
      );
      cleanup();
    });
  } else {
    // Lightweight path — no patching, no byte counting, no Server-Timing
    res.on("close", () => {
      const durMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      logger.info(
        `[search] ${req.method} ${req.originalUrl} ${res.statusCode} ${durMs.toFixed(1)}ms`,
      );
    });
  }

  next();
}

// Append a phase to Server-Timing. Safe to call multiple times.
export function recordServerTiming(res: Response, name: string, durMs: number): void {
  if (res.headersSent) return;
  const part = `${name};dur=${durMs.toFixed(1)}`;
  const existing = res.getHeader("Server-Timing");
  res.setHeader("Server-Timing", existing ? `${existing}, ${part}` : part);
}
