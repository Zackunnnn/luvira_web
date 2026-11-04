// tests/e2e/reports/e2e-wa-reports.spec.ts
// ============================================================================
// FT-6 E2E Test: Langganan Laporan WhatsApp, Pengiriman Instan, & Outbox Verification
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { Role, WaOutboxStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/lingkar design/.gemini/antigravity/brain/42fcbf9f-7120-459c-a7e6-c34af5cc2869';

test.describe('FT-6: WhatsApp Reports Subscription E2E', () => {
  let ownerUser: any;
  let ownerCookie: string;
  let resellerUser: any;
  let resellerCookie: string;

  test.beforeEach(() => {
    test.setTimeout(90000);
  });

  test.beforeAll(async () => {
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    // 1. Owner dengan nomor HP terverifikasi
    ownerUser = await prisma.user.findFirst({
      where: { role: Role.OWNER },
    });
    if (!ownerUser) throw new Error('Pengguna Owner tidak ditemukan.');

    await prisma.user.update({
      where: { id: ownerUser.id },
      data: { phone: '6281211112222' },
    });

    const ownerToken = await createSession({
      userId: ownerUser.id,
      name: ownerUser.name,
      email: ownerUser.email,
      role: ownerUser.role,
      regionId: null,
    });
    ownerCookie = ownerToken;

    // 2. Reseller dengan nomor HP terverifikasi
    resellerUser = await prisma.user.findFirst({
      where: { role: Role.RESELLER },
    });
    if (!resellerUser) {
      resellerUser = await prisma.user.create({
        data: {
          name: 'Reseller E2E WA',
          email: `reseller-wa-${Date.now()}@luvira.test`,
          passwordHash: 'dummy-hash',
          role: Role.RESELLER,
          phone: '6281233334444',
          isActive: true,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: resellerUser.id },
        data: { phone: '6281233334444' },
      });
    }

    const resellerToken = await createSession({
      userId: resellerUser.id,
      name: resellerUser.name,
      email: resellerUser.email,
      role: resellerUser.role,
      regionId: null,
    });
    resellerCookie = resellerToken;

    // Bersihkan langganan lama & outbox tes
    await prisma.reportSubscription.deleteMany({
      where: { userId: { in: [ownerUser.id, resellerUser.id] } },
    });
    await prisma.waOutbox.deleteMany({
      where: { target: { in: ['6281211112222', '6281233334444'] } },
    });
  });

  test.afterAll(async () => {
    await prisma.reportSubscription.deleteMany({
      where: { userId: { in: [ownerUser?.id, resellerUser?.id].filter(Boolean) } },
    });
    await prisma.waOutbox.deleteMany({
      where: { target: { in: ['6281211112222', '6281233334444'] } },
    });
  });

  test('Owner mengatur langganan laporan WhatsApp dan menguji pengiriman instan ke outbox', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: ownerCookie,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/dashboard/owner');
    await page.waitForLoadState('networkidle');

    // Scroll ke bagian Langganan Laporan WhatsApp
    const waCard = page.locator('text=Langganan Laporan WhatsApp').first();
    await expect(waCard).toBeVisible({ timeout: 15000 });
    await waCard.scrollIntoViewIfNeeded();

    // Verifikasi nomor tujuan tampil
    await expect(page.locator('text=Tujuan: 6281211112222')).toBeVisible();

    // Simpan langganan
    const btnSave = page.locator('button:has-text("Simpan Langganan")');
    await btnSave.click();

    // Tunggu notifikasi berhasil
    await expect(page.locator('text=Langganan laporan WhatsApp berhasil disimpan')).toBeVisible({ timeout: 15000 });

    // Klik "Kirim Sekarang (Tes)"
    const btnSendNow = page.locator('button:has-text("Kirim Sekarang (Tes)")');
    await btnSendNow.click();

    // Tunggu feedback berhasil & pratinjau pesan
    await expect(page.locator('text=dikirim ke antrean WhatsApp')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('text=Pratinjau Pesan WhatsApp:')).toBeVisible();

    // Tangkap Screenshot Owner WA Report
    const screenshotPath = path.join(ARTIFACT_DIR, 'screenshot_wa_report_subscription_owner.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBe(true);

    // Verifikasi pesan masuk ke database WaOutbox
    const outboxMessage = await prisma.waOutbox.findFirst({
      where: {
        target: '6281211112222',
        relatedType: 'REPORT',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(outboxMessage).not.toBeNull();
    expect(outboxMessage?.message).toContain('LAPORAN EKSEKUTIF LUVIRA 2.0');
    expect(outboxMessage?.status).toBe(WaOutboxStatus.PENDING);
  });

  test('Reseller membuka modal Laporan WA, menyimpan langganan, dan melakukan uji kirim instan', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: resellerCookie,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/dashboard/reseller');
    await page.waitForLoadState('networkidle');

    // Klik tombol aksi cepat "Laporan WA (FT-6)"
    const btnOpenWaModal = page.locator('button:has-text("Laporan WA")').first();
    await expect(btnOpenWaModal).toBeVisible({ timeout: 10000 });
    await btnOpenWaModal.click();

    // Modal terbuka
    await expect(page.locator('text=Langganan Laporan WhatsApp Reseller')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=RESELLER (Pesanan Saya)')).toBeVisible();
    await expect(page.locator('text=Tujuan: 6281233334444')).toBeVisible();

    // Klik "Kirim Sekarang (Tes)"
    const btnSendNow = page.locator('button:has-text("Kirim Sekarang (Tes)")');
    await btnSendNow.click();

    // Tunggu pratinjau pesan reseller
    await expect(page.locator('text=Pratinjau Pesan WhatsApp:')).toBeVisible({ timeout: 25000 });

    // Tangkap Screenshot Reseller WA Modal
    const screenshotPath = path.join(ARTIFACT_DIR, 'screenshot_wa_report_reseller_modal.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBe(true);

    // Verifikasi pesan masuk ke WaOutbox
    const outboxMessage = await prisma.waOutbox.findFirst({
      where: {
        target: '6281233334444',
        relatedType: 'REPORT',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(outboxMessage).not.toBeNull();
    expect(outboxMessage?.message).toContain('RINGKASAN PENJUALAN RESELLER LUVIRA');
    expect(outboxMessage?.message).not.toContain('HPP');
    expect(outboxMessage?.status).toBe(WaOutboxStatus.PENDING);
  });
});
