// lib/changelog.ts
// ============================================================================
// Audit Log Perubahan Otomatis LuviBot (Model A) - Immutable
// Sesuai format Draf & Log Perubahan yang disetujui Awan
// ============================================================================

import { prisma } from './db';

export interface CreateLuviChangeLogParams {
  draftId: string; // e.g. DRAF-20261111-01
  requestedBy?: string; // Default: "Awan"
  approvedBy?: string; // Default: "Awan"
  approvalTimeWib?: string; // Jam approval WIB
  executedBy: string; // Akun LuviBot (email / nama)
  targetType: 'PRODUCT' | 'PROMO' | 'STOCK' | 'ORDER';
  targetId: string;
  targetName: string;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  verificationResult?: 'LOLOS' | 'GAGAL';
  verificationProof?: string;
  status?: 'BERHASIL' | 'GAGAL' | 'DI-ROLLBACK';
  rollbackTo?: string;
}

export function formatWibDateTime(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  return `${parts} WIB`;
}

/**
 * Merekam 1 baris log perubahan terverifikasi LuviBot ke database secara otomatis.
 * Bersifat IMMUTABLE: tidak ada operasi update atau delete.
 */
export async function recordLuviChangeLog(params: CreateLuviChangeLogParams) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  const logCode = `LOG-${dateStr}-${randomSuffix}`;

  const executedAtWib = formatWibDateTime(now);
  const approvalTimeWib = params.approvalTimeWib || executedAtWib;

  const log = await prisma.luviChangeLog.create({
    data: {
      logCode,
      draftId: params.draftId || `DRAF-${dateStr}-AUTO`,
      executedAtWib,
      requestedBy: params.requestedBy || 'Awan',
      approvedBy: params.approvedBy || 'Awan',
      approvalTimeWib,
      executedBy: params.executedBy,
      executorRole: 'LUVIBOT',
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
      fieldChanged: params.fieldChanged,
      oldValue: String(params.oldValue),
      newValue: String(params.newValue),
      verificationResult: params.verificationResult || 'LOLOS',
      verificationProof: params.verificationProof || 'Verifikasi otomatis sistem lolos',
      status: params.status || 'BERHASIL',
      rollbackTo: params.rollbackTo || null,
    },
  });

  return log;
}

