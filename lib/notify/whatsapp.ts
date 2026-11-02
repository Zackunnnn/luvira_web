// lib/notify/whatsapp.ts
// ============================================================================
// Adapter Gateway WhatsApp (Fonnte) - FT-1
// Mode: mock | log | fonnte (via WA_MODE env)
// Menangani normalisasi nomor, payload Fonnte resmi, dan pemetaan galat
// ============================================================================

import { normalizeWhatsAppNumber } from '@/lib/whatsapp';

export type WaMode = 'mock' | 'log' | 'fonnte';

export interface SendWhatsAppParams {
  target: string | string[]; // Nomor tujuan tunggal atau jamak (akan dinormalisasi ke format 62...)
  message: string;
  url?: string; // URL publik langsung file lampiran (gambar/PDF)
  filename?: string;
  schedule?: number; // Unix timestamp
  delay?: string; // Delay bertipe STRING (misal "2", "4" detik) antar target
  typing?: boolean;
}

export interface SendWhatsAppResult {
  success: boolean;
  providerMessageId?: string;
  reason?: string;
  isTemporary?: boolean; // True jika galat bersifat sementara dan layak dicoba ulang (retryable)
}

export interface FonnteDeviceStatusResult {
  status: boolean;
  device?: string;
  deviceStatus?: string; // e.g. "connect", "disconnect"
  quota?: number;
  expired?: string;
  messages?: string;
}

/**
 * Pemetaan pesan galat Fonnte ke Bahasa Indonesia yang ramah pengguna,
 * sekaligus mengelompokkan ke galat sementara vs permanen.
 */
export function mapFonnteError(rawReason: string, httpStatus?: number): { message: string; isTemporary: boolean } {
  const lower = (rawReason || '').toLowerCase();

  // 1. Galat HTTP Status
  if (httpStatus === 401 || httpStatus === 403 || lower.includes('invalid token') || lower.includes('unauthorized')) {
    return {
      message: 'Kredensial atau Token Fonnte tidak valid / kadaluwarsa. Periksa FONNTE_TOKEN di konfigurasi.',
      isTemporary: false,
    };
  }

  if (httpStatus === 429 || lower.includes('limit') || lower.includes('quota') || lower.includes('rate limit')) {
    return {
      message: 'Batas kuota harian atau rate limit Fonnte tercapai.',
      isTemporary: true,
    };
  }

  if (httpStatus && httpStatus >= 500) {
    return {
      message: `Server Fonnte sedang mengalami gangguan (HTTP ${httpStatus}). Coba beberapa saat lagi.`,
      isTemporary: true,
    };
  }

  // 2. Galat Perangkat & Koneksi WhatsApp
  if (lower.includes('device disconnected') || lower.includes('disconnected') || lower.includes('qr')) {
    return {
      message: 'Perangkat WhatsApp pada Fonnte terputus. Silakan hubungkan kembali (scan QR) di dashboard Fonnte.',
      isTemporary: true,
    };
  }

  if (lower.includes('invalid target') || lower.includes('number not registered') || lower.includes('invalid number')) {
    return {
      message: 'Nomor WhatsApp tujuan tidak valid atau tidak terdaftar di WhatsApp.',
      isTemporary: false,
    };
  }

  if (lower.includes('timeout') || lower.includes('econnrefused') || lower.includes('network')) {
    return {
      message: 'Koneksi jaringan ke Fonnte terputus atau timeout.',
      isTemporary: true,
    };
  }

  return {
    message: rawReason || 'Terjadi kesalahan tidak diketahui saat menghubungi Fonnte gateway.',
    isTemporary: false,
  };
}

/**
 * Mengirim pesan WhatsApp via Fonnte Adapter sesuai mode WA_MODE.
 */
export async function sendWhatsAppMessage(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  const mode: WaMode = (process.env.WA_MODE as WaMode) || 'mock';

  // 1. Normalisasi nomor tujuan
  let targetsArray: string[] = [];
  if (Array.isArray(params.target)) {
    targetsArray = params.target.map(t => normalizeWhatsAppNumber(t)).filter(Boolean);
  } else if (typeof params.target === 'string') {
    targetsArray = params.target
      .split(',')
      .map(t => normalizeWhatsAppNumber(t.trim()))
      .filter(Boolean);
  }

  if (targetsArray.length === 0) {
    return {
      success: false,
      reason: 'Nomor tujuan WhatsApp kosong atau tidak valid.',
      isTemporary: false,
    };
  }

  const normalizedTarget = targetsArray.join(',');

  // Pastikan delay berupa STRING jika ditentukan (persyaratan spesifikasi Fonnte)
  const delayStr: string = params.delay ? String(params.delay) : '2';

  // 2. Mode MOCK (untuk unit test, integrasi, dan dev tanpa kredensial aktif)
  if (mode === 'mock') {
    const mockId = `mock-fonnte-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    return {
      success: true,
      providerMessageId: mockId,
      reason: 'Pesan berhasil disimulasikan (mode mock)',
      isTemporary: false,
    };
  }

  // 3. Mode LOG (cetak payload ke console untuk debugging lokal tanpa internet)
  if (mode === 'log') {
    console.log('[WA LOG] WhatsApp Message Dispatched:', {
      target: normalizedTarget,
      message: params.message,
      url: params.url,
      filename: params.filename,
      delay: delayStr,
    });
    return {
      success: true,
      providerMessageId: `log-${Date.now()}`,
      reason: 'Pesan dicatat di log console (mode log)',
      isTemporary: false,
    };
  }

  // 4. Mode FONNTE (Panggilan API Asli ke https://api.fonnte.com/send)
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    return {
      success: false,
      reason: 'FONNTE_TOKEN tidak dikonfigurasi di environment variable.',
      isTemporary: false,
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('target', normalizedTarget);
    formData.append('message', params.message);
    formData.append('countryCode', '62');

    if (params.url) formData.append('url', params.url);
    if (params.filename) formData.append('filename', params.filename);
    if (params.schedule) formData.append('schedule', String(params.schedule));
    if (targetsArray.length > 1) formData.append('delay', delayStr);
    if (params.typing) formData.append('typing', 'true');

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: token.trim(), // Token langsung tanpa "Bearer" sesuai docs Fonnte
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.status === false) {
      const rawReason = data.reason || data.message || `HTTP ${res.status}`;
      const mapped = mapFonnteError(rawReason, res.status);
      return {
        success: false,
        reason: mapped.message,
        isTemporary: mapped.isTemporary,
      };
    }

    // Ambil ID pesan dari Fonnte (bisa berupa id tunggal atau array id)
    const providerId = Array.isArray(data.id) ? data.id.join(',') : (data.id || `fonnte-${Date.now()}`);

    return {
      success: true,
      providerMessageId: String(providerId),
      reason: 'Pesan berhasil dikirim via Fonnte.',
      isTemporary: false,
    };
  } catch (error: any) {
    const mapped = mapFonnteError(error.message || 'Network exception');
    return {
      success: false,
      reason: mapped.message,
      isTemporary: mapped.isTemporary,
    };
  }
}

/**
 * Memeriksa status perangkat Fonnte (koneksi, nama perangkat, kuota sisa).
 */
export async function checkFonnteDeviceStatus(): Promise<FonnteDeviceStatusResult> {
  const mode = process.env.WA_MODE || 'mock';

  if (mode !== 'fonnte') {
    return {
      status: true,
      device: `Simulasi WhatsApp Gateway (${mode})`,
      deviceStatus: 'connect',
      quota: 9999,
      messages: 'Gateway dalam mode non-aktif/mock. Semua pengiriman disimulasikan.',
    };
  }

  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    return {
      status: false,
      deviceStatus: 'disconnect',
      messages: 'FONNTE_TOKEN belum diisi.',
    };
  }

  try {
    const res = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: {
        Authorization: token.trim(),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.status === false) {
      return {
        status: false,
        deviceStatus: 'disconnect',
        messages: data.reason || data.message || `HTTP ${res.status}`,
      };
    }

    return {
      status: true,
      device: data.device || 'Fonnte WA Gateway',
      deviceStatus: data.device_status || 'connect',
      quota: data.quota || 0,
      expired: data.expired || undefined,
      messages: data.messages || 'Terhubung aktif',
    };
  } catch (err: any) {
    return {
      status: false,
      deviceStatus: 'disconnect',
      messages: err.message || 'Gagal menghubungi server Fonnte.',
    };
  }
}
