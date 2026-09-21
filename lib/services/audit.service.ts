import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface LogAuditParams {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function logAudit(
  params: LogAuditParams,
  tx?: Prisma.TransactionClient
) {
  const db = tx || prisma;
  try {
    return await db.auditLog.create({
      data: {
        actorId: params.actorId || null,
        actorRole: params.actorRole || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        oldValue: params.oldValue ? (params.oldValue as Prisma.InputJsonValue) : Prisma.JsonNull,
        newValue: params.newValue ? (params.newValue as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
    // Audit logging should not crash the main operation unless strict auditing is required
    return null;
  }
}
