// lib/audit.ts
// ============================================================================
// Audit Log Helper Luvira 2.0 (Append-Only)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 7 & 10
// ============================================================================

import { prisma } from './db';
import { Prisma } from '@prisma/client';

export interface AuditActor {
  id?: string | null;
  name?: string | null;
  role?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditParams {
  actor?: AuditActor | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: any;
  after?: any;
}

/**
 * Mencatat mutasi ke tabel AuditLog.
 * Append-only: Tidak ada fungsi update atau delete.
 * Mendukung eksekusi di dalam transaksi Prisma jika `tx` diberikan.
 */
export async function audit(
  params: AuditParams,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx || prisma;

  try {
    await client.auditLog.create({
      data: {
        actorId: params.actor?.id || null,
        actorName: params.actor?.name || null,
        actorRole: params.actor?.role || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        before: params.before !== undefined ? JSON.parse(JSON.stringify(params.before)) : Prisma.DbNull,
        after: params.after !== undefined ? JSON.parse(JSON.stringify(params.after)) : Prisma.DbNull,
        ipAddress: params.actor?.ipAddress || null,
        userAgent: params.actor?.userAgent || null,
      },
    });
  } catch (error) {
    // Audit failure should not crash business operation, but should be logged to console
    console.error('[AuditLog Error] Gagal mencatat audit log:', error);
  }
}

export interface RecordAuditParams {
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: any;
  after?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAuditLog(params: RecordAuditParams, tx?: Prisma.TransactionClient): Promise<void> {
  return audit(
    {
      actor: {
        id: params.actorId,
        name: params.actorName,
        role: params.actorRole,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      before: params.before,
      after: params.after,
    },
    tx
  );
}
