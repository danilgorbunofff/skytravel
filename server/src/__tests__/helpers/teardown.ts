import { after } from "node:test";
import prisma from "../../prisma.js";
import { sessionStore } from "../../lib/sessionStore.js";

let registered = false;

/**
 * Close every pooled connection / background timer opened by importing the
 * real app (Prisma pool + express-mysql-session store + its expiry interval),
 * so `node --test` worker processes can exit instead of hanging forever.
 *
 * Call once at module top-level in any test file that imports `createApp`.
 */
export function registerTeardown(): void {
  if (registered) return;
  registered = true;

  after(async () => {
    const maybeInterval = (sessionStore as unknown as { clearExpiredInterval?: NodeJS.Timeout })
      .clearExpiredInterval;
    if (maybeInterval) clearInterval(maybeInterval);

    await new Promise<void>((resolve) => {
      sessionStore.close(() => resolve());
    });

    await prisma.$disconnect();
  });
}
