// lib/reseller/masking.ts
// ============================================================================
// Reseller Privacy & Data Masking Engine (FT-4, Asumsi F4)
//
// Aturan Privasi Mutlak:
// 1. Nama pelanggan disamarkan: 'Budi Santoso' -> 'B*** S***'
// 2. Nomor WhatsApp hanya tampil 4 digit terakhir: '••••1234'
// 3. Tanpa alamat detail (street, RT/RW, ditiadakan)
// 4. Tanpa HPP (costPrice, costEach), packingCost, atau stok gudang
// ============================================================================

export function maskCustomerName(name?: string | null): string {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'P***';
  }

  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => {
      if (p.length === 0) return '';
      const firstChar = p[0].toUpperCase();
      return `${firstChar}***`;
    })
    .join(' ');
}

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') {
    return '••••0000';
  }

  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) {
    return `••••${digits.padStart(4, '0')}`;
  }

  const last4 = digits.slice(-4);
  return `••••${last4}`;
}

export function maskCustomerEmail(email?: string | null): string | null {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return null;
  }

  const [username, domain] = email.split('@');
  const initial = username.length > 0 ? username[0] : 'u';
  return `${initial}***@${domain}`;
}

/**
 * Sanitasi mendalam objek Order sebelum dikembalikan ke Reseller
 */
export function sanitizeOrderForReseller<T extends Record<string, any>>(order: T): T {
  if (!order) return order;

  // Deep clone untuk menghindari mutasi objek cache/db
  const safeOrder: any = JSON.parse(JSON.stringify(order));

  // 1. Masking identitas pelanggan
  safeOrder.customerName = maskCustomerName(safeOrder.customerName);
  safeOrder.customerPhone = maskPhoneNumber(safeOrder.customerPhone);
  if (safeOrder.customerEmail) {
    safeOrder.customerEmail = maskCustomerEmail(safeOrder.customerEmail);
  }

  // 2. Samarkan alamat (hanya sisakan nama kota/provinsi umum untuk referensi pengiriman)
  if (safeOrder.shippingAddress) {
    const orig = safeOrder.shippingAddress;
    safeOrder.shippingAddress = {
      city: orig.cityName || orig.city || 'Disamarkan',
      province: orig.provinceName || orig.province || '',
      type: orig.type || 'PENGIRIMAN',
    };
  }

  // 3. Hapus seluruh data HPP, kemasan, dan modal dari item
  if (Array.isArray(safeOrder.items)) {
    safeOrder.items = safeOrder.items.map((item: any) => {
      delete item.costEach;
      delete item.packingEach;
      delete item.costPrice;
      delete item.packingCost;
      if (item.variant) {
        delete item.variant.cost;
        delete item.variant.costPrice;
      }
      return item;
    });
  }

  return safeOrder as T;
}

