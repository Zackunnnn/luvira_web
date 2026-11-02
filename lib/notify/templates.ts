// lib/notify/templates.ts
// ============================================================================
// WhatsApp Message Templates (Bahasa Indonesia, Singkat, Padat, Profesional)
// Sesuai FT-1 & FT-6 (Pesanan Uji diawali awalan "[UJI]")
// ============================================================================

export interface NewOrderAdminParams {
  orderCode: string;
  total: number;
  regionName: string;
  itemsSummary: string;
  paymentMethod: string;
  isTest?: boolean;
}

export interface NewProofAdminParams {
  orderCode: string;
  customerName: string;
  bankName?: string;
  amount: number;
  isTest?: boolean;
}

export interface LowStockAdminParams {
  productName: string;
  variantName: string;
  currentStock: number;
  regionName: string;
}

export interface PaymentConfirmedBuyerParams {
  orderCode: string;
  customerName: string;
  total: number;
  trackUrl: string;
  isTest?: boolean;
}

export interface OrderShippedBuyerParams {
  orderCode: string;
  customerName: string;
  courier: string;
  trackingNumber: string;
  trackUrl: string;
  isTest?: boolean;
}

export interface OrderExpiredBuyerParams {
  orderCode: string;
  customerName: string;
  isTest?: boolean;
}

export interface CodNewAdminParams {
  orderCode: string;
  creatorName: string;
  creatorRole: string;
  regionName: string;
  total: number;
  isTest?: boolean;
}

export interface SalesReportDigestParams {
  dateText: string;
  regionName?: string;
  totalOrders: number;
  totalItems: number;
  totalDiscount: number;
  totalRevenue: number;
  topProducts?: { name: string; qty: number }[];
  downloadUrl?: string;
  isTest?: boolean;
}

const formatRp = (num: number) => `Rp ${(num || 0).toLocaleString('id-ID')}`;

export const templates = {
  /**
   * 1. Notifikasi Pesanan Baru ke Admin Wilayah / Pusat
   */
  newOrderAdmin(params: NewOrderAdminParams): string {
    const prefix = params.isTest ? '[UJI] ' : '';
    return [
      `🔔 ${prefix}*PESANAN BARU MASUK*`,
      ``,
      `Kode: *${params.orderCode}*`,
      `Wilayah Penangan: ${params.regionName}`,
      `Metode Bayar: ${params.paymentMethod}`,
      `Item: ${params.itemsSummary}`,
      `Total: *${formatRp(params.total)}*`,
      ``,
      `Silakan periksa dan tindak lanjuti di Dashboard Operasional Luvira.`,
    ].join('\n');
  },

  /**
   * 2. Notifikasi Bukti Transfer Diunggah ke Admin
   */
  newTransferProofAdmin(params: NewProofAdminParams): string {
    const prefix = params.isTest ? '[UJI] ' : '';
    return [
      `💳 ${prefix}*BUKTI TRANSFER BARU*`,
      ``,
      `Pesanan: *${params.orderCode}*`,
      `Atas Nama: ${params.customerName}`,
      `Bank Tujuan: ${params.bankName || 'BCA / Mandiri'}`,
      `Nominal: *${formatRp(params.amount)}*`,
      ``,
      `Mohon segera verifikasi bukti transfer di Dashboard Admin.`,
    ].join('\n');
  },

  /**
   * 3. Peringatan Stok Menipis ke Admin
   */
  lowStockAdmin(params: LowStockAdminParams): string {
    return [
      `⚠️ *PERINGATAN STOK MENIPIS*`,
      ``,
      `Produk: *${params.productName}*`,
      `Varian: ${params.variantName}`,
      `Gudang/Wilayah: ${params.regionName}`,
      `Sisa Stok: *${params.currentStock} pcs*`,
      ``,
      `Mohon jadwalkan restok segera sebelum kehabisan.`,
    ].join('\n');
  },

  /**
   * 4. Notifikasi Pembayaran Berhasil ke Pembeli (Consent Only)
   */
  paymentConfirmedBuyer(params: PaymentConfirmedBuyerParams): string {
    const prefix = params.isTest ? '[UJI] ' : '';
    return [
      `✨ ${prefix}*PEMBAYARAN DITERIMA*`,
      ``,
      `Halo Kak *${params.customerName}*,`,
      `Terima kasih! Pembayaran untuk pesanan *${params.orderCode}* sebesar *${formatRp(params.total)}* telah kami verifikasi.`,
      ``,
      `Pesanan Anda sedang dipersiapkan dan akan segera diserahkan ke kurir.`,
      ``,
      `Pantau proses pesanan Anda di:`,
      `${params.trackUrl}`,
      ``,
      `Salam hangat,`,
      `*Luvira Official Store*`,
    ].join('\n');
  },

  /**
   * 5. Notifikasi Pesanan Dikirim ke Pembeli (Consent Only)
   */
  orderShippedBuyer(params: OrderShippedBuyerParams): string {
    const prefix = params.isTest ? '[UJI] ' : '';
    return [
      `📦 ${prefix}*PESANAN TELAH DIKIRIM*`,
      ``,
      `Halo Kak *${params.customerName}*,`,
      `Kabar gembira! Pesanan Anda *${params.orderCode}* sudah dalam perjalanan.`,
      ``,
      `Kurir: *${params.courier}*`,
      `Nomor Resi: *${params.trackingNumber}*`,
      ``,
      `Lacak posisi paket Anda secara langsung di:`,
      `${params.trackUrl}`,
      ``,
      `Terima kasih telah berbelanja di Luvira!`,
    ].join('\n');
  },

  /**
   * 6. Notifikasi Pesanan Kedaluwarsa ke Pembeli (Consent Only)
   */
  orderExpiredBuyer(params: OrderExpiredBuyerParams): string {
    const prefix = params.isTest ? '[UJI] ' : '';
    return [
      `⏰ ${prefix}*PESANAN KEDALUWARSA*`,
      ``,
      `Halo Kak *${params.customerName}*,`,
      `Pesanan Anda *${params.orderCode}* telah dibatalkan otomatis karena melewati batas waktu pembayaran.`,
      ``,
      `Jika Anda masih membutuhkan kaus kaki Luvira, silakan pesan kembali melalui website luvira.id. Terima kasih.`,
    ].join('\n');
  },

  /**
   * 7. Pesanan Manual COD Baru ke Admin Wilayah
   */
  codNewAdmin(params: CodNewAdminParams): string {
    const prefix = params.isTest ? '[UJI] ' : '';
    return [
      `🤝 ${prefix}*PESANAN COD BARU DIBUAT*`,
      ``,
      `Kode: *${params.orderCode}*`,
      `Dibuat Oleh: *${params.creatorName}* (${params.creatorRole})`,
      `Wilayah Pemenuhan: ${params.regionName}`,
      `Total Tagihan COD: *${formatRp(params.total)}*`,
      ``,
      `Status saat ini: Menunggu Serah Terima. Hubungi pembuat pesanan untuk serah terima barang dan penerimaan kas.`,
    ].join('\n');
  },

  /**
   * 8. Laporan Penjualan Lengkap ke WhatsApp Owner & Admin (FT-6 & Permintaan Lengkap)
   */
  salesReportDigest(params: SalesReportDigestParams): string {
    const prefix = params.isTest ? '[UJI] ' : '';
    const regionText = params.regionName ? ` (${params.regionName})` : ' (Konsolidasi Seluruh Outlet)';

    const productLines = (params.topProducts || []).slice(0, 5).map(
      (p, i) => `  ${i + 1}. ${p.name}: *${p.qty} pcs*`
    );

    const lines = [
      `📊 ${prefix}*LAPORAN PENJUALAN LUVIRA*`,
      `Periode: ${params.dateText}${regionText}`,
      `────────────────────────`,
      `• Total Transaksi : *${params.totalOrders} pesanan*`,
      `• Produk Terjual  : *${params.totalItems} pasang/pcs*`,
      `• Total Diskon    : ${formatRp(params.totalDiscount)}`,
      `• *Total Omzet*   : *${formatRp(params.totalRevenue)}*`,
    ];

    if (productLines.length > 0) {
      lines.push(``, `🔥 *Produk Terlaris:*`, ...productLines);
    }

    if (params.downloadUrl) {
      lines.push(
        ``,
        `📥 *Unduh Dokumen Laporan Lengkap:*`,
        `${params.downloadUrl}`,
        `_(Tautan berlaku selama 15 menit)_`
      );
    }

    lines.push(``, `Dicetak otomatis oleh Sistem Luvira 2.0.`);
    return lines.join('\n');
  },
};
