// tests/e2e/reseller/e2e-reseller-dashboard.spec.ts
// ============================================================================
// FT-4 E2E Test: Dashboard Reseller (Mobile-First, Data Masking, & Promo Cards)
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { Role, OrderStatus, PaymentMethod, DiscountType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/lingkar design/.gemini/antigravity/brain/42fcbf9f-7120-459c-a7e6-c34af5cc2869';

test.describe('FT-4: E2E Dashboard Reseller (Desktop & Mobile Viewport)', () => {
  let resellerUser: any;
  let resellerCookie: string;
  let pusatRegion: any;
  let product: any;
  let variant: any;
  let promoCode: any;
  let order1: any;
  let order2: any;

  test.beforeAll(async () => {
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    if (!pusatRegion) throw new Error('Wilayah Pusat tidak ditemukan.');

    // 1. Setup Product & Variant
    product = await prisma.product.findFirst({ include: { variants: true } });
    if (!product || product.variants.length === 0) {
      product = await prisma.product.create({
        data: {
          name: 'Kaus Kaki Premium Reseller E2E',
          slug: `kaus-kaki-reseller-e2e-${Date.now()}`,
          price: 50000,
          description: 'E2E Testing Product',
          model: 'ANKLE',
          variants: {
            create: {
              name: 'Hitam Jetblack',
              sku: `SKU-E2E-RES-${Date.now()}`,
              hex: '#000000',
              imageUrl: '/socks/placeholder.webp',
            },
          },
        },
        include: { variants: true },
      });
    }
    variant = product.variants[0];

    // 2. Setup Reseller User
    const rand = Math.floor(1000 + Math.random() * 9000);
    resellerUser = await prisma.user.create({
      data: {
        email: `reseller.e2e.${rand}@luvira.id`,
        name: 'Siti Reseller Luvira',
        role: Role.RESELLER,
        regionId: pusatRegion.id,
        phone: '6281234567890',
        passwordHash: 'dummy-password-hash',
      },
    });

    const token = await createSession({
      userId: resellerUser.id,
      name: resellerUser.name,
      email: resellerUser.email,
      role: Role.RESELLER,
      regionId: resellerUser.regionId,
    });
    resellerCookie = token;

    // 3. Setup Promo Code linked to Reseller
    promoCode = await prisma.promoCode.create({
      data: {
        code: `RESELLER-VIP-${rand}`,
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        quota: 100,
        usedCount: 2,
        isActive: true,
        resellerId: resellerUser.id,
      },
    });

    // 4. Create Order 1 (Public Order with Reseller Promo)
    order1 = await prisma.order.create({
      data: {
        code: `LVR-RES-${rand}-01`,
        status: OrderStatus.SELESAI,
        paymentMethod: PaymentMethod.MIDTRANS_SNAP,
        customerName: 'Budi Santoso',
        customerPhone: '6281234567890',
        customerEmail: 'budi.santoso@example.com',
        shippingAddress: {
          provinceName: 'Jawa Barat',
          cityName: 'Depok',
          street: 'Jl. Margonda Raya No. 10',
        },
        regionId: pusatRegion.id,
        subtotal: 100000,
        discountAmount: 15000,
        netPrice: 85000,
        ppnAmount: 9350,
        shippingCost: 6000,
        totalPrice: 100350,
        promoCodeId: promoCode.id,
        isTest: false,
        expiresAt: new Date(Date.now() + 86400000),
        items: {
          create: {
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            quantity: 2,
            priceEach: 50000,
            subtotal: 100000,
          },
        },
      },
    });

    // 5. Create Order 2 (Manual COD Created by Reseller)
    order2 = await prisma.order.create({
      data: {
        code: `LVR-COD-${rand}-02`,
        status: OrderStatus.DIPROSES,
        paymentMethod: PaymentMethod.COD,
        customerName: 'Dewi Lestari',
        customerPhone: '6289876543210',
        customerEmail: 'dewi.lestari@example.com',
        shippingAddress: {
          province: 'Pusat',
          city: 'Pusat',
          type: 'COD',
        },
        regionId: pusatRegion.id,
        subtotal: 50000,
        discountAmount: 0,
        netPrice: 50000,
        ppnAmount: 5500,
        shippingCost: 0,
        totalPrice: 55500,
        isTest: false,
        isManual: true,
        createdByUserId: resellerUser.id,
        createdByRole: Role.RESELLER,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        items: {
          create: {
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            quantity: 1,
            priceEach: 50000,
            subtotal: 50000,
          },
        },
      },
    });
  });

  test.afterAll(async () => {
    // Cleanup
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: [order1?.id, order2?.id].filter(Boolean) } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: [order1?.id, order2?.id].filter(Boolean) } },
    });
    await prisma.promoCode.deleteMany({
      where: { id: promoCode?.id },
    });
    await prisma.user.deleteMany({
      where: { id: resellerUser?.id },
    });
  });

  test('TC-RES-01: Reseller Dashboard (Desktop Viewport) - Masking & Metrik Kinerja', async ({ page, context }) => {
    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: resellerCookie,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/reseller');
    await page.waitForLoadState('networkidle');

    // 1. Verifikasi Header Akun
    await expect(page.locator('text=Siti Reseller Luvira')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Reseller', { exact: true })).toBeVisible();

    // 2. Verifikasi Kartu Metrik
    await expect(page.locator('text=Total Pesanan')).toBeVisible();
    await expect(page.locator('text=Omzet Bersih')).toBeVisible();

    // 3. Verifikasi Kartu Kode Promo Saya
    await expect(page.locator(`text=${promoCode.code}`).first()).toBeVisible();
    await expect(page.locator('text=Kode Promo Saya')).toBeVisible();

    // 4. Verifikasi Masking Privasi Pelanggan (B*** S*** & D*** L***)
    await expect(page.locator('text=B*** S***')).toBeVisible();
    await expect(page.locator('text=••••7890')).toBeVisible();
    await expect(page.locator('text=D*** L***')).toBeVisible();
    await expect(page.locator('text=••••3210')).toBeVisible();

    // Pastikan nama lengkap dan telepon asli TIDAK bocor di DOM
    const bodyText = await page.textContent('body');
    expect(bodyText).not.toContain('Budi Santoso');
    expect(bodyText).not.toContain('Dewi Lestari');
    expect(bodyText).not.toContain('081234567890');

    // Tangkap Screenshot Desktop
    const screenshotDesktop = path.join(ARTIFACT_DIR, 'screenshot_reseller_dashboard_desktop.png');
    await page.screenshot({ path: screenshotDesktop, fullPage: true });
    console.log(`Saved screenshot to ${screenshotDesktop}`);
  });

  test('TC-RES-02: Reseller Dashboard (Mobile Viewport 390x844) & Modal Profil', async ({ page, context }) => {
    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: resellerCookie,
        domain: 'localhost',
        path: '/',
      },
    ]);

    // Set mobile viewport (iPhone 13 standard)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/reseller');
    await page.waitForLoadState('networkidle');

    // Verifikasi mobile elements
    await expect(page.locator('text=Buat COD')).toBeVisible();
    await expect(page.locator('text=Unduh Data')).toBeVisible();
    await expect(page.locator('text=Laporan WA')).toBeVisible();

    // Verifikasi data pesanan tetap tersaji rapi di mobile
    await expect(page.locator('text=B*** S***')).toBeVisible();

    // Buka Modal Profil & Sandi
    await page.click('button:has-text("Profil & Sandi")');
    await expect(page.locator('text=Pengaturan Profil & Sandi')).toBeVisible();
    await expect(page.locator('text=Nomor WhatsApp (Aktif)')).toBeVisible();

    // Tangkap Screenshot Mobile
    const screenshotMobile = path.join(ARTIFACT_DIR, 'screenshot_reseller_dashboard_mobile.png');
    await page.screenshot({ path: screenshotMobile });
    console.log(`Saved mobile screenshot to ${screenshotMobile}`);
  });

  test('TC-RES-03: Navigasi ke Buat Pesanan Manual COD dengan Dual Promo Slots', async ({ page, context }) => {
    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: resellerCookie,
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard/reseller/orders/manual');
    await page.waitForLoadState('networkidle');

    // Verifikasi form pesanan manual COD
    await expect(page.locator('text=Buat Pesanan Manual (COD)')).toBeVisible();

    // Verifikasi ketersediaan Slot 1 dan Slot 2 Kode Promo
    await expect(page.locator('#input-manual-promo')).toBeVisible();
    await expect(page.locator('#input-manual-promo-2')).toBeVisible();
    await expect(page.locator('text=Slot 1: Kode Promo Utama (Reseller / COD)')).toBeVisible();
    await expect(page.locator('text=Slot 2: Kode Promo Tambahan / Voucher Diskon')).toBeVisible();

    // Verifikasi ongkir COD terpaksa Rp 0
    await expect(page.locator('text=Rp 0 (COD, serah langsung)')).toBeVisible();

    // Tangkap Screenshot Form Manual COD dengan 2 Slot Promo
    const screenshotDualPromo = path.join(ARTIFACT_DIR, 'screenshot_reseller_manual_cod_dual_promo.png');
    await page.screenshot({ path: screenshotDualPromo, fullPage: true });
    console.log(`Saved screenshot to ${screenshotDualPromo}`);
  });
});
