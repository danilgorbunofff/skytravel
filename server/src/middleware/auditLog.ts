import prisma from "../prisma.js";

export async function logAdminAction(params: {
  action: string;
  target: string;
  details?: string;
  adminUser?: string;
  ip?: string;
}) {
  try {
    await prisma.auditLog.create({ data: params });
  } catch {
    // Audit logging must never break the request
  }
}
