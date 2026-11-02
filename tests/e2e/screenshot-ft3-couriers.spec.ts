// tests/e2e/screenshot-ft3-couriers.spec.ts
// ============================================================================
// Playwright E2E: Screenshot Showcase untuk Regional Courier Control & FT-3
// ============================================================================

import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { Role, OrderStatus, PaymentMethod } from '@prisma/client';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/lingkar design/.gemini/antigravity/brain/42fcbf9f-7120-459c-a7e6-c34af5cc2869';

test.describe('Visual Showcase: Regional Couriers & FT-3 Test Promo Simulation', () => {
  let jogjaRegion: any;
  let pusatRegion: any;
  let testOrder: any;
  let product: any;
  let variant: any;

  test.beforeAll(async () => {
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });

    // Set Yogyakarta couriers to J&T only
    if (jogjaRegion) {
      await prisma.region.update({
        where: { id: jogjaRegion.id },
        data: { activeCouriers: ['jnt'] },
      });
    }

    // Get an existing or fallback product
    product = await prisma.product.findFirst({
      include: { variants: true },
    });
    if (!product || product.variants.length === 0) {
      product = await prisma.product.create({
        data: {
          name: 'Kaus Kaki Emboss Split Toe Premium',
          slug: `kaus-kaki-showcase-${Date.now()}`,
          price: 75000,
          description: 'Showcase product for courier and testing promo',
          model: 'ANKLE',
          variants: {
            create: {
              name: 'Hitam Jetblack',
              sku: `SKU-SHOW-${Date.now()}`,
              hex: '#000000',
              imageUrl: '/socks/placeholder.webp',
              weightGram: 35,
            },
          },
        },
        include: { variants: true },
      });
    }
    variant = product.variants[0];

    // Ensure stock exists in Jogja
    if (jogjaRegion && variant) {
      await prisma.stock.upsert({
        where: {
          variantId_regionId: {
            regionId: jogjaRegion.id,
            variantId: variant.id,
          },
        },
        update: { qty: 50 },
        create: {
          regionId: jogjaRegion.id,
          variantId: variant.id,
          qty: 50,
        },
      });
    }

    // Create a realistic test order for payment simulation & owner view
    testOrder = await prisma.order.create({
      data: {
        code: `LVR-UJI-${Date.now().toString().slice(-4)}`,
        status: OrderStatus.MENUNGGU_PEMBAYARAN,
        paymentMethod: PaymentMethod.TEST_SIMULATION,
        isTest: true,
        totalPrice: 75000,
        subtotal: 75000,
        netPrice: 65000,
        shippingCost: 0,
        discountAmount: 10000,
        ppnAmount: 0,
        customerName: 'Aisyah Nurul',
        customerPhone: '081234567899',
        shippingAddress: {
          province: 'DI Yogyakarta',
          city: 'Kota Yogyakarta',
          district: 'Danurejan',
          street: 'Jl. Malioboro No. 45',
        },
        regionId: jogjaRegion?.id || pusatRegion?.id,
        expiresAt: new Date(Date.now() + 86400000),
        items: {
          create: {
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            quantity: 1,
            priceEach: 75000,
            subtotal: 75000,
          },
        },
      },
    });
  });

  test.afterAll(async () => {
    // Restore Yogyakarta couriers to all 3
    if (jogjaRegion) {
      await prisma.region.update({
        where: { id: jogjaRegion.id },
        data: { activeCouriers: ['jne', 'sicepat', 'jnt'] },
      });
    }
    // Delete created showcase test order
    if (testOrder) {
      await prisma.orderStatusLog.deleteMany({ where: { orderId: testOrder.id } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
      await prisma.order.delete({ where: { id: testOrder.id } });
    }
  });

  test('1. Admin Pusat Kontrol Kurir per Wilayah (screenshot_admin_courier_control.png)', async ({ page, context }) => {
    await page.setViewportSize({ width: 1366, height: 860 });

    const adminToken = await createSession({
      userId: 'usr-admin-pusat-ss',
      email: 'admin.pusat@luvira.id',
      name: 'Admin Pusat Luvira',
      role: Role.ADMIN_PUSAT,
      regionId: pusatRegion?.id,
    });

    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: adminToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/dashboard/admin');
    await page.waitForLoadState('networkidle');

    // Click "Wilayah & Kurir" tab
    const tabBtn = page.locator('button:has-text("Wilayah & Kurir")');
    await tabBtn.waitFor({ state: 'visible', timeout: 10000 });
    await tabBtn.click();

    // Wait for locations to render
    await page.waitForTimeout(1500);

    // Capture Admin Courier Control
    const screenshotPath = `${ARTIFACT_DIR}/screenshot_admin_courier_control.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('2. Checkout Pembeli Hanya Menampilkan Kurir Aktif J&T (screenshot_checkout_courier_restricted.png)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 950 });

    // Seed localStorage cart
    await page.addInitScript(({ prod, vari }) => {
      const dummyCart = {
        state: {
          items: [
            {
              product: {
                id: prod.id,
                name: prod.name,
                price: prod.price,
                category: 'Ankle',
                coverImage: '/socks/placeholder.webp',
              },
              selectedVariant: {
                id: vari.id,
                name: vari.name,
                sku: vari.sku,
              },
              quantity: 2,
            },
          ],
        },
        version: 0,
      };
      localStorage.setItem('luvira-cart-storage', JSON.stringify(dummyCart));
      localStorage.setItem('luvira_customer_name', 'Budi Santoso');
      localStorage.setItem('luvira_customer_phone', '081298765432');
      localStorage.setItem('luvira_saved_address', JSON.stringify({
        provinceId: '5',
        provinceName: 'DI Yogyakarta',
        cityId: '501',
        cityName: 'Kota Yogyakarta',
        districtId: 'danurejan',
        districtName: 'Danurejan',
        subDistrictId: '31405',
        subDistrictName: 'Suryatmajan',
        postalCode: '55213',
        street: 'Jl. Malioboro No. 45',
      }));
    }, { prod: product, vari: variant });

    await page.goto('/checkout');
    await page.waitForTimeout(3000);

    const screenshotPath = `${ARTIFACT_DIR}/screenshot_checkout_courier_restricted.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('3. Halaman Pembayaran Simulasi QR Uji & Tombol Bayar (screenshot_payment_test_simulation.png)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto(`/order/${testOrder.id}/payment`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Verify simulation UI elements are present
    const testBadge = page.locator('text=MODE PENGUJIAN');
    await expect(testBadge).toBeVisible();

    const qrText = page.locator(`text=LUVIRA-UJI:${testOrder.code}`);
    await expect(qrText).toBeVisible();

    const simBtn = page.locator('button:has-text("Simulasikan Bayar Sukses")');
    await expect(simBtn).toBeVisible();

    const screenshotPath = `${ARTIFACT_DIR}/screenshot_payment_test_simulation.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });

  test('4. Dashboard Owner Menampilkan Badge [UJI] & Tombol Reset (screenshot_owner_test_orders.png)', async ({ page, context }) => {
    await page.setViewportSize({ width: 1366, height: 860 });

    const ownerToken = await createSession({
      userId: 'usr-owner-ss',
      email: 'owner@luvira.id',
      name: 'Owner Luvira Official',
      role: Role.OWNER,
      regionId: null,
    });

    await context.addCookies([
      {
        name: SESSION_COOKIE_NAME,
        value: ownerToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);

    await page.goto('/dashboard/owner');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const resetBtn = page.locator('button:has-text("Reset Data Uji")');
    await expect(resetBtn).toBeVisible();

    const screenshotPath = `${ARTIFACT_DIR}/screenshot_owner_test_orders.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    expect(fs.existsSync(screenshotPath)).toBe(true);
  });
});
