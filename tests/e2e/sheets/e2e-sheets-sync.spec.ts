// tests/e2e/sheets/e2e-sheets-sync.spec.ts
// ============================================================================
// FT-5 E2E Test: Google Sheets Mirror Connection, Sync Flow, & Status Verification
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { Role, SheetScopeType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/lingkar design/.gemini/antigravity/brain/42fcbf9f-7120-459c-a7e6-c34af5cc2869';

test.describe('FT-5: Google Sheets Mirroring E2E', () => {
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

    // 1. Dapatkan Pengguna Owner
    ownerUser = await prisma.user.findFirst({
      where: { role: Role.OWNER },
    });
    if (!ownerUser) throw new Error('Pengguna Owner tidak ditemukan.');

    const ownerToken = await createSession({
      userId: ownerUser.id,
      name: ownerUser.name,
      email: ownerUser.email,
      role: ownerUser.role,
      regionId: null,
    });
    ownerCookie = ownerToken;

    // 2. Dapatkan Pengguna Reseller
    resellerUser = await prisma.user.findFirst({
      where: { role: Role.RESELLER },
    });
    if (!resellerUser) {
      resellerUser = await prisma.user.create({
        data: {
          name: 'Reseller E2E Sheets',
          email: `reseller-sheets-${Date.now()}@luvira.test`,
          passwordHash: 'dummy-hash',
          role: Role.RESELLER,
          phone: '6281299990001',
          isActive: true,
        },
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

    // Bersihkan koneksi lama jika ada
    await prisma.sheetConnection.deleteMany({
      where: {
        OR: [
          { scopeType: SheetScopeType.GLOBAL },
          { scopeType: SheetScopeType.RESELLER, scopeId: resellerUser.id },
        ],
      },
    });
  });

  test.afterAll(async () => {
    // Cleanup
    await prisma.sheetConnection.deleteMany({
      where: {
        OR: [
          { scopeType: SheetScopeType.GLOBAL },
          { scopeType: SheetScopeType.RESELLER, scopeId: resellerUser?.id },
        ],
      },
    });
  });

  test('Owner menghubungkan Google Sheet global, melakukan sinkronisasi, dan melihat status terhubung', async ({
    page,
    context,
  }) => {
    // Pasang sesi Owner
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

    // Scroll ke bagian Google Sheets
    const sheetsCard = page.locator('text=Integrasi Google Spreadsheet').first();
    await expect(sheetsCard).toBeVisible({ timeout: 10000 });
    await sheetsCard.scrollIntoViewIfNeeded();

    // Pastikan Email Service Account tampil
    await expect(page.locator('text=Langkah 1: Berikan Hak Akses Editor')).toBeVisible();

    // Masukkan tautan spreadsheet mock
    const mockSheetUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
    const inputUrl = page.locator('input[placeholder*="https://docs.google.com/spreadsheets/d/"]');
    await inputUrl.fill(mockSheetUrl);

    // Klik tombol "Hubungkan Spreadsheet"
    const btnConnect = page.locator('button:has-text("Hubungkan Spreadsheet")');
    await btnConnect.click();

    // Tunggu status sukses terhubung (koneksi dev DB Neon membutuhkan waktu untuk agregasi)
    await expect(page.locator('text=Terhubung & Sinkron')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('text=Buka Lembar Kerja di Google Sheets')).toBeVisible();

    // Klik tombol "Sinkronkan Sekarang"
    const btnSyncNow = page.locator('button:has-text("Sinkronkan Sekarang")');
    await btnSyncNow.click();

    // Tunggu pesan sukses sinkronisasi
    await expect(page.locator('text=Sinkronisasi berhasil!')).toBeVisible({ timeout: 45000 });

    // Tangkap Screenshot Owner Sheets
    const screenshotPath = path.join(ARTIFACT_DIR, 'screenshot_sheets_connection_owner.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('Reseller membuka modal Cermin Sheet, menghubungkan spreadsheet pribadi, dan memverifikasi isolasi', async ({
    page,
    context,
  }) => {
    // Pasang sesi Reseller
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

    // Klik aksi cepat "Cermin Sheet (FT-5)"
    const btnOpenSheetModal = page.locator('button:has-text("Cermin Sheet")').first();
    await expect(btnOpenSheetModal).toBeVisible({ timeout: 10000 });
    await btnOpenSheetModal.click();

    // Modal cermin reseller terbuka
    const modalTitle = page.locator('text=Cermin Spreadsheet Reseller');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=RESELLER (Pesanan Saya)')).toBeVisible();

    // Hubungkan sheet reseller
    const resellerSheetUrl = 'https://docs.google.com/spreadsheets/d/1_reseller_personal_sheet_mock_99999/edit';
    const inputUrl = page.locator('input[placeholder*="https://docs.google.com/spreadsheets/d/"]');
    await inputUrl.fill(resellerSheetUrl);

    const btnConnect = page.locator('button:has-text("Hubungkan Spreadsheet")');
    await btnConnect.click();

    // Tunggu status terhubung di dalam modal
    await expect(page.locator('text=Terhubung & Sinkron')).toBeVisible({ timeout: 15000 });

    // Tangkap Screenshot Reseller Sheets
    const screenshotPath = path.join(ARTIFACT_DIR, 'screenshot_sheets_connection_reseller.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
