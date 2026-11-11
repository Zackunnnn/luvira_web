import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/lingkar design/.gemini/antigravity/brain/42fcbf9f-7120-459c-a7e6-c34af5cc2869';

test.describe('LuviBot Sub-Admin Model A End-to-End Live Verification', () => {
  const credentials = {
    email: 'luvibot.test@luvira.id',
    password: 'LuviraTest2026!',
  };

  test('Alur Lengkap Model A: Login, Cek Hak Akses, Ganti Harga dengan Approval, Verifikasi Publik & Checkout, Audit Log, dan Rollback', async ({ page, request }) => {
    // 1. Login ke Dashboard Luvira sebagai LUVIBOT
    await page.goto('/dashboard/login');
    await page.fill('input[placeholder*="@"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');

    // Pastikan ter-redirect ke /dashboard/luvibot
    await page.waitForURL('**/dashboard/luvibot', { timeout: 15000 });
    await expect(page).toHaveURL(/.*\/dashboard\/luvibot/);

    // Ambil screenshot dashboard LuviBot
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_luvibot_dashboard.png'), fullPage: true });

    // 2. Verifikasi Isolasi & Larangan Akses (Forbidden Routes)
    // Coba buka /dashboard/admin -> harus diarahkan ke /forbidden
    await page.goto('/dashboard/admin');
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/forbidden/);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_luvibot_forbidden_admin.png') });

    // Coba buka /dashboard/owner -> harus diarahkan ke /forbidden
    await page.goto('/dashboard/owner');
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/forbidden/);

    // Coba buka /dashboard/developer -> harus diarahkan ke /forbidden
    await page.goto('/dashboard/developer');
    await page.waitForURL('**/forbidden', { timeout: 5000 });
    await expect(page).toHaveURL(/.*\/forbidden/);

    // Kembali ke /dashboard/luvibot
    await page.goto('/dashboard/luvibot');
    await page.waitForSelector('text=Ganti Harga');

    // 3. Tab Ganti Harga: Skenario Model A
    await page.click('button:has-text("Ganti Harga")');
    await page.waitForTimeout(500);

    // Cari produk uji coba E2E COD atau produk pertama
    const productSelect = page.locator('select').first();
    await productSelect.waitFor({ state: 'visible' });

    // Screenshot form draf perubahan harga
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_luvibot_price_draft_form.png') });

    // Pilih produk pertama dari dropdown (index 1)
    await page.selectOption('select', { index: 1 });
    await page.waitForTimeout(500);

    // Draf Perubahan Harga
    const draftId = 'DRAF-20261111-01';
    const approvalTimeWib = '11/11/2026, 11:20:00 WIB';
    const newPrice = '65000';

    await page.fill('input[placeholder*="DRAF-"]', draftId);
    await page.fill('input[placeholder*="WIB"]', approvalTimeWib);
    await page.fill('input[placeholder*="38000"]', newPrice);

    // Klik tombol eksekusi perubahan harga
    await page.click('button:has-text("Eksekusi Perubahan Harga")');

    // Tunggu notifikasi sukses
    await page.waitForSelector('text=Sukses! Harga berhasil diubah', { timeout: 10000 });

    // 4. Buka Tab Log Perubahan untuk memastikan log audit tercatat
    await page.click('button:has-text("Log Perubahan")');
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${draftId}`)).toBeVisible();
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_luvibot_changelog_view.png') });

    // 5. Verifikasi Publik & Checkout
    // Buka halaman beranda/katalog publik
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_luvibot_price_changed_public.png') });

    // Buka checkout
    await page.goto('/checkout');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_luvibot_checkout_verification.png') });

    // 6. Rollback ke Harga Semula
    await page.goto('/dashboard/luvibot');
    await page.waitForSelector('text=Ganti Harga');
    await page.click('button:has-text("Ganti Harga")');
    await page.waitForTimeout(500);

    // Pilih produk yang sama
    await page.selectOption('select', { index: 1 });
    await page.waitForTimeout(500);

    // Eksekusi Rollback
    await page.fill('input[placeholder*="DRAF-"]', 'DRAF-20261111-01-ROLLBACK');
    await page.fill('input[placeholder*="WIB"]', '11:30 WIB');
    await page.fill('input[placeholder*="38000"]', '60000');
    await page.click('button:has-text("Eksekusi Perubahan Harga")');

    await page.waitForSelector('text=Sukses! Harga berhasil diubah', { timeout: 10000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'screenshot_luvibot_rollback_success.png') });
  });

  test('API Route Guard: Percobaan Aksi Terlarang & Tanpa Approval Ditolak 400/403', async ({ request }) => {
    // 1. Login via API untuk mendapatkan cookie sesi LUVIBOT
    const loginRes = await request.post('/api/auth/login', {
      data: {
        email: credentials.email,
        password: credentials.password,
      },
    });
    expect(loginRes.status()).toBe(200);

    // 2. Coba ganti harga TANPA draftId -> Harus 400 Bad Request (Model A Guard)
    const priceNoDraftRes = await request.put('/api/admin/pricing', {
      data: {
        productId: 'cmvz9rcia0000ban9iar96ijs',
        price: 55000,
        // draftId dikosongkan
      },
    });
    expect(priceNoDraftRes.status()).toBe(400);
    const priceErr = await priceNoDraftRes.json();
    expect(priceErr.error).toContain('Model A');

    // 3. Coba Hapus Produk (DELETE /api/admin/products/:id) -> Mutlak 403 Forbidden
    const deleteProductRes = await request.delete('/api/admin/products/cmvz9rcia0000ban9iar96ijs');
    expect(deleteProductRes.status()).toBe(403);
    const deleteErr = await deleteProductRes.json();
    expect(deleteErr.error).toContain('menghapus produk');

    // 4. Coba Hapus Audit Log (DELETE /api/changelog) -> Mutlak 403 Forbidden (Immutable)
    const deleteLogRes = await request.delete('/api/changelog');
    expect(deleteLogRes.status()).toBe(403);
    const logErr = await deleteLogRes.json();
    expect(logErr.error).toContain('immutable');

    // 5. Coba Intip HPP (GET /api/owner/cost-prices) -> Mutlak 403 Forbidden
    const costPriceRes = await request.get('/api/owner/cost-prices');
    expect(costPriceRes.status()).toBe(403);

    // 6. Coba Export Laporan (GET /api/owner/reports/export) -> Mutlak 403 Forbidden
    const exportReportsRes = await request.get('/api/owner/reports/export');
    expect(exportReportsRes.status()).toBe(403);

    // 7. Coba Akses Health Developer (GET /api/developer/health) -> Mutlak 403 Forbidden
    const devHealthRes = await request.get('/api/developer/health');
    expect(devHealthRes.status()).toBe(403);

    // 8. Coba Buat Pesanan COD Manual (POST /api/orders/manual) -> Mutlak 403 Forbidden
    const codRes = await request.post('/api/orders/manual', {
      data: {
        customerName: 'Test Buyer',
        customerPhone: '081234567890',
        shippingAddress: 'Jl. Test No. 1',
        originRegionId: 'region-pusat',
        items: [{ variantId: 'test-var', qty: 1 }],
      },
    });
    expect(codRes.status()).toBe(403);
  });
});
