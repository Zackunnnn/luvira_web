// tests/e2e/screenshot-showcase.spec.ts
// ============================================================================
// Playwright Script untuk Mengambil Screenshot Komprehensif
// 1. Checkout Page dengan checkbox persetujuan WhatsApp (waConsent)
// 2. Pratinjau Laporan Penjualan Harian tema Hijau Tua (#14532d) dengan Data Realistis
// ============================================================================

import { test, expect } from '@playwright/test';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/auth';
import { Role } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/lingkar design/.gemini/antigravity/brain/42fcbf9f-7120-459c-a7e6-c34af5cc2869';

test.describe('Visual QA & Showcase Screenshot', () => {
  test('Capture Screenshot: Checkout dengan WhatsApp Consent & Laporan Penjualan Hijau Tua', async ({ page, context }) => {
    if (!fs.existsSync(ARTIFACT_DIR)) {
      fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }

    // ========================================================================
    // 1. SCREENSHOT CHECKOUT: Persetujuan WhatsApp (waConsent)
    // ========================================================================
    await page.setViewportSize({ width: 1280, height: 950 });

    await page.addInitScript(() => {
      const dummyCart = {
        state: {
          items: [
            {
              product: {
                id: 'prod-emboss',
                name: 'Kaus Kaki Emboss Split Toe Premium',
                price: 75000,
                category: 'Emboss',
                coverImage: '/images/products/sock-black.jpg',
              },
              selectedVariant: {
                id: 'var-black',
                name: 'Hitam Jetblack',
                sku: 'LVR-EMB-BLK',
              },
              quantity: 2,
            },
            {
              product: {
                id: 'prod-wudhu',
                name: 'Kaus Kaki Wudhu Friendly',
                price: 50000,
                category: 'Wudhu',
                coverImage: '/images/products/sock-cream.jpg',
              },
              selectedVariant: {
                id: 'var-cream',
                name: 'Cream Natural',
                sku: 'LVR-WDH-CRM',
              },
              quantity: 1,
            },
          ],
        },
        version: 0,
      };
      localStorage.setItem('luvira-cart-storage', JSON.stringify(dummyCart));
      localStorage.setItem('luvira_customer_name', 'Fatima Zahra');
      localStorage.setItem('luvira_customer_phone', '081234567890');
    });

    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    const waCheckbox = page.locator('#wa-consent-checkbox');
    await expect(waCheckbox).toBeVisible();

    const checkoutShotPath = path.join(ARTIFACT_DIR, 'screenshot_checkout_wa_consent.png');
    await page.screenshot({ path: checkoutShotPath, fullPage: false });
    console.log('[Screenshot Saved]', checkoutShotPath);

    // ========================================================================
    // 2. SCREENSHOT MODAL LAPORAN PENJUALAN HARIAN: Tema Hijau Tua (#14532d)
    // ========================================================================
    const ownerToken = await createSession({
      userId: 'usr-owner-qa',
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

    const mockTransactions = [
      {
        id: 'ord-01',
        code: 'INV/0726/0001',
        createdAt: '2026-07-29T08:30:00.000Z',
        paymentMethod: 'Tunai',
        subtotal: 150000,
        discountAmount: 5000,
        totalPrice: 145000,
        items: [{ productName: 'Produk A', variantName: 'Standar', quantity: 2, priceEach: 75000 }],
      },
      {
        id: 'ord-02',
        code: 'INV/0726/0002',
        createdAt: '2026-07-29T09:15:00.000Z',
        paymentMethod: 'MIDTRANS_SNAP',
        subtotal: 120000,
        discountAmount: 0,
        totalPrice: 120000,
        items: [{ productName: 'Produk B', variantName: 'Standar', quantity: 1, priceEach: 120000 }],
      },
      {
        id: 'ord-03',
        code: 'INV/0726/0003',
        createdAt: '2026-07-29T10:00:00.000Z',
        paymentMethod: 'Debit',
        subtotal: 150000,
        discountAmount: 0,
        totalPrice: 150000,
        items: [{ productName: 'Produk C', variantName: 'Standar', quantity: 3, priceEach: 50000 }],
      },
      {
        id: 'ord-04',
        code: 'INV/0726/0004',
        createdAt: '2026-07-29T11:20:00.000Z',
        paymentMethod: 'Tunai',
        subtotal: 200000,
        discountAmount: 10000,
        totalPrice: 190000,
        items: [{ productName: 'Produk D', variantName: 'Standar', quantity: 1, priceEach: 200000 }],
      },
      {
        id: 'ord-05',
        code: 'INV/0726/0005',
        createdAt: '2026-07-29T13:05:00.000Z',
        paymentMethod: 'MIDTRANS_SNAP',
        subtotal: 300000,
        discountAmount: 15000,
        totalPrice: 285000,
        items: [{ productName: 'Produk A', variantName: 'Standar', quantity: 4, priceEach: 75000 }],
      },
      {
        id: 'ord-06',
        code: 'INV/0726/0006',
        createdAt: '2026-07-29T14:40:00.000Z',
        paymentMethod: 'Tunai',
        subtotal: 180000,
        discountAmount: 0,
        totalPrice: 180000,
        items: [{ productName: 'Produk E', variantName: 'Standar', quantity: 2, priceEach: 90000 }],
      },
      {
        id: 'ord-07',
        code: 'INV/0726/0007',
        createdAt: '2026-07-29T15:10:00.000Z',
        paymentMethod: 'MIDTRANS_SNAP',
        subtotal: 120000,
        discountAmount: 5000,
        totalPrice: 115000,
        items: [{ productName: 'Produk B', variantName: 'Standar', quantity: 1, priceEach: 120000 }],
      },
      {
        id: 'ord-08',
        code: 'INV/0726/0008',
        createdAt: '2026-07-29T16:25:00.000Z',
        paymentMethod: 'Debit',
        subtotal: 100000,
        discountAmount: 0,
        totalPrice: 100000,
        items: [{ productName: 'Produk C', variantName: 'Standar', quantity: 2, priceEach: 50000 }],
      },
      {
        id: 'ord-09',
        code: 'INV/0726/0009',
        createdAt: '2026-07-29T17:00:00.000Z',
        paymentMethod: 'Tunai',
        subtotal: 200000,
        discountAmount: 0,
        totalPrice: 200000,
        items: [{ productName: 'Produk D', variantName: 'Standar', quantity: 1, priceEach: 200000 }],
      },
      {
        id: 'ord-10',
        code: 'INV/0726/0010',
        createdAt: '2026-07-29T17:45:00.000Z',
        paymentMethod: 'MIDTRANS_SNAP',
        subtotal: 75000,
        discountAmount: 0,
        totalPrice: 75000,
        items: [{ productName: 'Produk A', variantName: 'Standar', quantity: 1, priceEach: 75000 }],
      },
    ];

    // Mock API responses SEBELUM page.goto
    await page.route('**/api/owner/reports**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: {
            grossRevenue: 1560000,
            netRevenue: 1560000,
            grossProfit: 860000,
            totalOrders: 10,
            totalItemsSold: 18,
          },
          transactions: mockTransactions,
        }),
      });
    });

    await page.route('**/api/owner/analytics**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          summary: {
            totalOrders: 10,
            actualRevenue: 1560000,
            netSales: 1560000,
            totalCost: 700000,
            totalPpn: 0,
            totalShipping: 0,
            netProfit: 860000,
          },
          transactions: mockTransactions,
          lowStock: [],
        }),
      });
    });

    await page.goto('/dashboard/owner');
    await page.waitForLoadState('domcontentloaded');

    // Tunggu tombol aktif
    const btnPreview = page.locator('#btn-preview-report');
    await expect(btnPreview).toBeVisible({ timeout: 10000 });
    await expect(btnPreview).toBeEnabled({ timeout: 10000 });
    await btnPreview.click();

    // Tunggu modal dan dokumen tabel muncul
    const modalDocument = page.locator('#sales-report-printable');
    await expect(modalDocument).toBeVisible({ timeout: 5000 });

    const reportShotPath = path.join(ARTIFACT_DIR, 'screenshot_laporan_penjualan_hijau_tua.png');
    await modalDocument.screenshot({ path: reportShotPath });
    console.log('[Screenshot Saved]', reportShotPath);
  });
});
