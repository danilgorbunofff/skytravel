import bcrypt from "bcryptjs";
import { config } from "../config.js";
import prisma from "../prisma.js";

/**
 * Create the admin user from ADMIN_LOGIN / ADMIN_PASSWORD if missing.
 * Called once at server startup (index.ts) and from integration tests
 * that exercise authenticated admin routes.
 */
export async function ensureAdminUser(): Promise<void> {
  const { login, password } = config.admin;
  if (!login || !password) return;

  const existing = await prisma.adminUser.findUnique({ where: { login } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.create({ data: { login, passwordHash } });
}
