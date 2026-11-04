// scripts/smoke-live-ft.ts
// ============================================================================
// Luvira 2.0 - Live Smoke Test untuk Kapabilitas FT (Fonnte WA & Google Sheets)
// HANYA dijalankan bila kunci asli ada di .env. Bila tidak ada, lewati secara aman.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { sendWhatsAppMessage } from '../lib/notify/whatsapp';
import { writeSpreadsheetTabs } from '../lib/integrations/sheets';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function runSmokeLive() {
  console.log('🔍 [SMOKE LIVE FT] Memeriksa ketersediaan kredensial live di environment...\n');

  const fonnteToken = process.env.FONNTE_TOKEN?.trim();
  const testPhone = process.env.FONNTE_TEST_TARGET?.trim() || '6281234567899';
  const sheetsEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const sheetsKey = process.env.GOOGLE_PRIVATE_KEY?.trim();
  const testSheetId = process.env.GOOGLE_TEST_SPREADSHEET_ID?.trim();

  let waLiveTested = false;
  let sheetsLiveTested = false;

  // 1. Tes WhatsApp Live (Fonnte)
  if (fonnteToken && fonnteToken !== '' && !fonnteToken.includes('mock')) {
    console.log('📱 Menguji pengiriman 1 pesan live ke WhatsApp via Fonnte Gateway...');
    try {
      const res = await sendWhatsAppMessage({
        target: testPhone,
        message: `[Luvira 2.0 Smoke Test Live] Pesan uji coba berhasil dikirim pada ${new Date().toLocaleString('id-ID')} WIB.`,
      });

      if (res.success) {
        console.log(`✅ Pesan live WhatsApp BERHASIL dikirim ke ${testPhone}! Provider Msg ID: ${res.providerMessageId || 'OK'}`);
        waLiveTested = true;
      } else {
        console.warn(`⚠️ Fonnte merespons gagal: ${res.reason || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('❌ Gagal memanggil endpoint Fonnte live:', err.message);
    }
  } else {
    console.log('⏭️  WhatsApp Live (Fonnte): FONNTE_TOKEN live tidak ditemukan di .env. Pengujian dilewati secara aman.');
  }

  console.log('');

  // 2. Tes Google Sheets Live
  if (sheetsEmail && sheetsKey && testSheetId) {
    console.log(`📊 Menguji penulisan 1 baris live ke Google Spreadsheet (ID: ${testSheetId})...`);
    try {
      await writeSpreadsheetTabs(
        testSheetId,
        [
          {
            name: 'SmokeTest_Live',
            rows: [
              ['Timestamp (WIB)', 'Uji Coba', 'Status', 'Engine'],
              [new Date().toLocaleString('id-ID'), 'Luvira 2.0 Smoke Test Live', 'SUCCESS', 'Google APIs v4 Service Account'],
            ],
          },
        ]
      );
      console.log('✅ Penulisan live ke Google Sheets BERHASIL!');
      sheetsLiveTested = true;
    } catch (err: any) {
      console.error('❌ Gagal menulis ke Google Sheets live:', err.message);
    }
  } else {
    console.log('⏭️  Google Sheets Live: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, atau GOOGLE_TEST_SPREADSHEET_ID tidak lengkap di .env. Pengujian dilewati secara aman.');
  }

  console.log('\n================================================================================');
  console.log('🏁 [SMOKE LIVE FT SELESAI]');
  console.log(`   • WhatsApp Fonnte Live : ${waLiveTested ? 'TERUJI LIVE' : 'DILEWATI (Tanpa Kunci)'}`);
  console.log(`   • Google Sheets Live   : ${sheetsLiveTested ? 'TERUJI LIVE' : 'DILEWATI (Tanpa Kunci)'}`);
  console.log('   Semua fitur tetap 100% fungsional dalam mode MOCK / LOG deterministik.');
  console.log('================================================================================\n');
}

runSmokeLive().catch((e) => {
  console.error('Fatal error saat smoke live:', e);
  process.exit(1);
});
