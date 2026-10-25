// app/api/owner/settings/route.ts
// ============================================================================
// API Pengaturan Bisnis Luvira 2.0 (Khusus Owner)
// Mengelola ppnRate, kurir aktif, batas diskon promo, ambang stok, & rekening transfer
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 5
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { audit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'settings:view')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }

    const [settingsList, paymentAccounts] = await Promise.all([
      prisma.setting.findMany(),
      prisma.paymentAccount.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const settingsMap: Record<string, any> = {
      ppnRate: 11,
      lowStockThreshold: 10,
      maxDiscountPercent: 50,
      activeCouriers: ['jne', 'sicepat', 'jnt'],
    };

    for (const s of settingsList) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({
      settings: settingsMap,
      paymentAccounts,
    });
  } catch (error: any) {
    console.error('[API Owner Settings GET Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal memuat pengaturan' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
    }

    if (!can(user, 'settings:manage')) {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Owner yang dapat mengubah pengaturan sistem.' }, { status: 403 });
    }

    const body = await request.json();
    const { ppnRate, lowStockThreshold, maxDiscountPercent, activeCouriers, paymentAccounts } = body;

    const previousSettings = await prisma.setting.findMany();

    await prisma.$transaction(async (tx) => {
      if (ppnRate !== undefined) {
        await tx.setting.upsert({
          where: { key: 'ppnRate' },
          update: { value: Math.max(0, parseInt(ppnRate, 10)) },
          create: { key: 'ppnRate', value: Math.max(0, parseInt(ppnRate, 10)), description: 'Tarif PPN dalam persen' },
        });
      }

      if (lowStockThreshold !== undefined) {
        await tx.setting.upsert({
          where: { key: 'lowStockThreshold' },
          update: { value: Math.max(0, parseInt(lowStockThreshold, 10)) },
          create: { key: 'lowStockThreshold', value: Math.max(0, parseInt(lowStockThreshold, 10)), description: 'Ambang batas stok menipis' },
        });
      }

      if (maxDiscountPercent !== undefined) {
        await tx.setting.upsert({
          where: { key: 'maxDiscountPercent' },
          update: { value: Math.max(1, Math.min(100, parseInt(maxDiscountPercent, 10))) },
          create: { key: 'maxDiscountPercent', value: Math.max(1, Math.min(100, parseInt(maxDiscountPercent, 10))), description: 'Batas maksimum diskon promo wilayah' },
        });
      }

      if (Array.isArray(activeCouriers)) {
        await tx.setting.upsert({
          where: { key: 'activeCouriers' },
          update: { value: activeCouriers },
          create: { key: 'activeCouriers', value: activeCouriers, description: 'Daftar kode kurir aktif' },
        });
      }

      // Kelola rekening transfer manual
      if (Array.isArray(paymentAccounts)) {
        for (const acc of paymentAccounts) {
          if (acc.id && !acc.id.startsWith('temp-')) {
            await tx.paymentAccount.update({
              where: { id: acc.id },
              data: {
                bankName: acc.bankName,
                accountNumber: acc.accountNumber,
                accountHolder: acc.accountHolder,
                isActive: acc.isActive !== undefined ? Boolean(acc.isActive) : true,
              },
            });
          } else if (acc.bankName && acc.accountNumber && acc.accountHolder) {
            await tx.paymentAccount.create({
              data: {
                bankName: acc.bankName.trim(),
                accountNumber: acc.accountNumber.trim(),
                accountHolder: acc.accountHolder.trim(),
                isActive: acc.isActive !== undefined ? Boolean(acc.isActive) : true,
              },
            });
          }
        }
      }
    });

    await audit({
      actor: { id: user.id, name: user.name, role: user.role },
      action: 'UPDATE_SETTINGS',
      entity: 'Setting',
      before: previousSettings,
      after: { ppnRate, lowStockThreshold, maxDiscountPercent, activeCouriers },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan sistem berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('[API Owner Settings PUT Error]', error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
