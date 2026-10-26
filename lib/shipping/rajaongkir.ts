// lib/shipping/rajaongkir.ts
// ============================================================================
// RajaOngkir API V2 Adapter (Komerce) dengan Mode Mock & Live
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 8.1
// ============================================================================

import { prisma } from '@/lib/db';

export interface Province {
  id: string;
  name: string;
}

export interface City {
  id: string;
  provinceId: string;
  name: string;
  type: string; // "Kota" atau "Kabupaten"
  postalCode?: string;
}

export interface District {
  id: string;
  cityId: string;
  name: string;
}

export interface SubDistrict {
  id: string;
  districtId: string;
  name: string;
  postalCode: string;
}

export interface QuickDestinationResult {
  id: string;
  label: string; // "Kemirimuka, Beji, Kota Depok, Jawa Barat 16423"
  provinceId: string;
  provinceName: string;
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  subDistrictId: string;
  subDistrictName: string;
  postalCode: string;
}

export interface ShippingCostOption {
  courier: string; // "jne", "pos", "tiki", "sicepat", "jnt"
  service: string; // "REG", "OKE", "YES"
  description: string;
  cost: number;
  etd: string; // "1-2 HARI"
}

export interface CalculateShippingInput {
  originId: string;
  destinationId: string;
  weightGram: number;
  courier: string;
}

// ----------------------------------------------------------------------------
// DATA DETERMINISTIK MOCK (WILAYAH LENGKAP UNTUK PENGEMBANGAN & PENGUJIAN)
// ----------------------------------------------------------------------------

export const MOCK_PROVINCES: Province[] = [
  { id: '31', name: 'DKI Jakarta' },
  { id: '32', name: 'Jawa Barat' },
  { id: '33', name: 'Jawa Tengah' },
  { id: '34', name: 'DI Yogyakarta' },
  { id: '35', name: 'Jawa Timur' },
  { id: '36', name: 'Banten' },
  { id: '12', name: 'Sumatera Utara' },
  { id: '13', name: 'Sumatera Barat' },
  { id: '51', name: 'Bali' },
];

export const MOCK_CITIES: City[] = [
  // Jawa Barat
  { id: '115', provinceId: '32', name: 'Kota Depok', type: 'Kota', postalCode: '16400' },
  { id: '116', provinceId: '32', name: 'Kota Bandung', type: 'Kota', postalCode: '40111' },
  { id: '117', provinceId: '32', name: 'Kota Bogor', type: 'Kota', postalCode: '16111' },
  { id: '118', provinceId: '32', name: 'Kota Bekasi', type: 'Kota', postalCode: '17111' },

  // DI Yogyakarta
  { id: '501', provinceId: '34', name: 'Kota Yogyakarta', type: 'Kota', postalCode: '55111' },
  { id: '502', provinceId: '34', name: 'Kabupaten Sleman', type: 'Kabupaten', postalCode: '55511' },
  { id: '503', provinceId: '34', name: 'Kabupaten Bantul', type: 'Kabupaten', postalCode: '55711' },
  { id: '504', provinceId: '34', name: 'Kabupaten Kulon Progo', type: 'Kabupaten', postalCode: '55611' },
  { id: '505', provinceId: '34', name: 'Kabupaten Gunungkidul', type: 'Kabupaten', postalCode: '55811' },

  // DKI Jakarta
  { id: '151', provinceId: '31', name: 'Kota Jakarta Selatan', type: 'Kota', postalCode: '12110' },
  { id: '152', provinceId: '31', name: 'Kota Jakarta Pusat', type: 'Kota', postalCode: '10110' },
];

export const MOCK_DISTRICTS: District[] = [
  // Kota Depok
  { id: '1151', cityId: '115', name: 'Beji' },
  { id: '1152', cityId: '115', name: 'Pancoran Mas' },
  { id: '1153', cityId: '115', name: 'Sukmajaya' },

  // Kota Yogyakarta
  { id: '5011', cityId: '501', name: 'Danurejan' },
  { id: '5012', cityId: '501', name: 'Gondomanan' },
  { id: '5013', cityId: '501', name: 'Kraton' },

  // Kab Sleman
  { id: '5021', cityId: '502', name: 'Depok (Sleman)' },
  { id: '5022', cityId: '502', name: 'Mlati' },
];

export const KOMERCE_ID_MAP: Record<string, string> = {
  // Depok
  '115': '25976',   // Kota Depok -> Beji Depok
  '1151': '25976',  // Beji
  '11511': '25978', // Kemiri Muka
  '11512': '25977', // Beji Timur
  '11513': '25979', // Kukusan
  // Yogyakarta
  '501': '31405',   // Kota Yogyakarta -> Danurejan
  '5011': '31405',  // Danurejan
  '50111': '31405', // Suryatmajan
  '50112': '31404', // Bausasran
  // Sleman
  '502': '31590',   // Sleman -> Catur Tunggal
  '5021': '31590',  // Depok Sleman
  '50211': '31590', // Catur Tunggal
  '50212': '31592', // Maguwoharjo
  // Jakarta
  '151': '17549',   // Jaksel
  '152': '17601',   // Jakpus
};

export function resolveKomerceId(id: string): string {
  if (!id) return id;
  return KOMERCE_ID_MAP[id] || id;
}

export const MOCK_SUBDISTRICTS: SubDistrict[] = [
  // Beji, Kota Depok (Komerce IDs: 25978, 25977, 25979)
  { id: '25978', districtId: '1151', name: 'Kemirimuka', postalCode: '16423' },
  { id: '25977', districtId: '1151', name: 'Beji Timur', postalCode: '16422' },
  { id: '25979', districtId: '1151', name: 'Kukusan', postalCode: '16425' },

  // Danurejan, Yogyakarta (Komerce IDs: 31405, 31404)
  { id: '31405', districtId: '5011', name: 'Suryatmajan', postalCode: '55213' },
  { id: '31404', districtId: '5011', name: 'Bausasran', postalCode: '55211' },

  // Depok, Sleman (Komerce IDs: 31590, 31592)
  { id: '31590', districtId: '5021', name: 'Caturtunggal', postalCode: '55281' },
  { id: '31592', districtId: '5021', name: 'Maguwoharjo', postalCode: '55282' },
];

// ----------------------------------------------------------------------------
// ADAPTER IMPLEMENTATION
// ----------------------------------------------------------------------------

export class RajaOngkirService {
  private mode: 'mock' | 'live';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    const rawUrl = process.env.RAJAONGKIR_URL || '';
    const isUrlAnApiKey = rawUrl && !rawUrl.startsWith('http');

    this.apiKey = process.env.RAJAONGKIR_API_KEY || (isUrlAnApiKey ? rawUrl : '');
    this.baseUrl = (isUrlAnApiKey || !rawUrl) ? 'https://rajaongkir.komerce.id/api/v1' : rawUrl;

    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    this.mode = (isTest ? 'mock' : (process.env.SHIPPING_MODE === 'live' ? 'live' : 'mock')) as 'mock' | 'live';
  }

  getMode() {
    return this.mode;
  }

  async getProvinces(): Promise<Province[]> {
    if (this.mode === 'mock') {
      return MOCK_PROVINCES;
    }

    try {
      const res = await fetch(`${this.baseUrl}/destination/province`, {
        headers: { key: this.apiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data.map((p: any) => ({ id: String(p.id), name: p.name }));
    } catch (err) {
      console.warn('[RajaOngkir Live Fallback to Mock]', err);
      return MOCK_PROVINCES;
    }
  }

  async getCities(provinceId: string): Promise<City[]> {
    if (this.mode === 'mock') {
      return MOCK_CITIES.filter((c) => c.provinceId === provinceId);
    }

    try {
      const res = await fetch(`${this.baseUrl}/destination/city/${provinceId}`, {
        headers: { key: this.apiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data.map((c: any) => ({
        id: String(c.id),
        provinceId: String(c.province_id),
        name: c.name,
        type: c.type || (c.name?.toLowerCase().includes('kota') ? 'Kota' : 'Kabupaten'),
        postalCode: c.postal_code || c.zip_code || '',
      }));
    } catch (err) {
      console.warn('[RajaOngkir Live Fallback to Mock]', err);
      return MOCK_CITIES.filter((c) => c.provinceId === provinceId);
    }
  }

  async getDistricts(cityId: string): Promise<District[]> {
    if (this.mode === 'mock') {
      return MOCK_DISTRICTS.filter((d) => d.cityId === cityId);
    }

    try {
      const res = await fetch(`${this.baseUrl}/destination/district/${cityId}`, {
        headers: { key: this.apiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data.map((d: any) => ({
        id: String(d.id),
        cityId: String(d.city_id),
        name: d.name,
      }));
    } catch (err) {
      console.warn('[RajaOngkir Live Fallback to Mock]', err);
      return MOCK_DISTRICTS.filter((d) => d.cityId === cityId);
    }
  }

  async getSubDistricts(districtId: string): Promise<SubDistrict[]> {
    if (this.mode === 'mock') {
      return MOCK_SUBDISTRICTS.filter((sd) => sd.districtId === districtId);
    }

    try {
      const res = await fetch(`${this.baseUrl}/destination/sub-district/${districtId}`, {
        headers: { key: this.apiKey },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data.map((sd: any) => ({
        id: String(sd.id),
        districtId: String(sd.district_id),
        name: sd.name,
        postalCode: sd.postal_code || sd.zip_code || '',
      }));
    } catch (err) {
      console.warn('[RajaOngkir Live Fallback to Mock]', err);
      return MOCK_SUBDISTRICTS.filter((sd) => sd.districtId === districtId);
    }
  }

  async quickSearchDestination(query: string): Promise<QuickDestinationResult[]> {
    const q = query.toLowerCase().trim();
    if (q.length < 3) return [];

    // Mode mock: lakukan pencarian berbasis mock data
    const results: QuickDestinationResult[] = [];
    for (const sd of MOCK_SUBDISTRICTS) {
      const district = MOCK_DISTRICTS.find((d) => d.id === sd.districtId);
      const city = district ? MOCK_CITIES.find((c) => c.id === district.cityId) : null;
      const province = city ? MOCK_PROVINCES.find((p) => p.id === city.provinceId) : null;

      if (district && city && province) {
        const fullStr = `${sd.name} ${district.name} ${city.name} ${province.name} ${sd.postalCode}`.toLowerCase();
        if (fullStr.includes(q)) {
          results.push({
            id: sd.id,
            label: `${sd.name}, ${district.name}, ${city.name}, ${province.name} ${sd.postalCode}`,
            provinceId: province.id,
            provinceName: province.name,
            cityId: city.id,
            cityName: city.name,
            districtId: district.id,
            districtName: district.name,
            subDistrictId: sd.id,
            subDistrictName: sd.name,
            postalCode: sd.postalCode,
          });
        }
      }
    }

    // 1. Jika live mode dan punya API key, cari langsung via Komerce API
    if (this.mode === 'live' && this.apiKey) {
      try {
        const res = await fetch(`${this.baseUrl}/destination/domestic-destination?search=${encodeURIComponent(query)}`, {
          headers: { key: this.apiKey },
        });
        if (res.ok) {
          const json = await res.json();
          const items = json.data || [];
          if (Array.isArray(items) && items.length > 0) {
            return items.map((item: any) => ({
              id: String(item.id || item.subdistrict_id),
              label: item.label,
              provinceId: String(item.province_id || ''),
              provinceName: item.province_name,
              cityId: String(item.city_id || ''),
              cityName: item.city_name,
              districtId: String(item.district_id || ''),
              districtName: item.district_name,
              subDistrictId: String(item.subdistrict_id || item.id),
              subDistrictName: item.subdistrict_name,
              postalCode: item.zip_code || '',
            }));
          }
        }
      } catch (liveErr) {
        console.warn('[RajaOngkir Live Search Error -> Fallback to Mock]', liveErr);
      }
    }

    // 2. Fallback ke data deterministik
    return results;
  }

  async calculateCost(input: CalculateShippingInput): Promise<ShippingCostOption[]> {
    const { originId: rawOriginId, destinationId: rawDestId, weightGram, courier = 'all' } = input;
    const originId = resolveKomerceId(rawOriginId);
    const destinationId = resolveKomerceId(rawDestId);
    const effectiveWeight = Math.max(1, weightGram);
    const courierKey = courier ? courier.toLowerCase() : 'all';
    const cacheKey = `ship:${originId}:${destinationId}:${effectiveWeight}:${courierKey}`;

    // 1. Cek cache database (khusus mode live)
    if (this.mode === 'live') {
      try {
        const cached = await prisma.shippingCache.findUnique({
          where: { cacheKey },
        });
        if (cached && new Date(cached.expiresAt).getTime() > Date.now()) {
          return cached.data as unknown as ShippingCostOption[];
        }
      } catch {
        // Abaikan jika cache query error
      }
    }

    let options: ShippingCostOption[] = [];

    if (this.mode === 'mock' || !this.apiKey) {
      options = this.generateDeterministicMockRates(rawOriginId, rawDestId, effectiveWeight, courierKey);
    } else {
      try {
        const couriersToQuery = courierKey === 'all'
          ? ['jne', 'sicepat', 'jnt', 'anteraja']
          : courierKey.split(',').map((c) => c.trim().toLowerCase());

        const promises = couriersToQuery.map(async (c) => {
          try {
            const body = new URLSearchParams({
              origin: originId,
              destination: destinationId,
              weight: String(effectiveWeight),
              courier: c,
              price: 'lowest',
            });

            const res = await fetch(`${this.baseUrl}/calculate/domestic-cost`, {
              method: 'POST',
              headers: {
                key: this.apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: body.toString(),
            });

            if (!res.ok) return [];
            const json = await res.json();
            const rawData = json.data || [];
            if (!Array.isArray(rawData)) return [];

            return rawData.map((item: any) => ({
              courier: (item.code || c).toUpperCase(),
              service: item.service,
              description: item.description || item.name || 'Layanan Reguler',
              cost: typeof item.cost === 'number' ? item.cost : (typeof item.cost?.[0]?.value === 'number' ? item.cost[0].value : 10000),
              etd: typeof item.etd === 'string'
                ? (item.etd.endsWith('day') ? item.etd.replace('day', 'HARI') : item.etd)
                : (item.cost?.[0]?.etd || '1-3 HARI'),
            }));
          } catch {
            return [];
          }
        });

        const results = await Promise.all(promises);
        const allFetched = results.flat();

        // Filter out cargo and heavy freight for retail apparel/socks (< 10 kg)
        const CARGO_KEYWORDS = [
          'JTR', 'GOKIL', 'KARGO', 'BIG', 'SPS', 'DANGEROUS',
          'VALUABLE', 'TRC', 'T15', 'T25', 'T60', 'CARGO', 'FROZEN', 'ICE'
        ];

        const parcelOnly = allFetched.filter((item) => {
          const s = (item.service || '').toUpperCase();
          const d = (item.description || '').toUpperCase();
          return !CARGO_KEYWORDS.some((k) => s.includes(k) || d.includes(k));
        });

        if (parcelOnly.length > 0) {
          options = parcelOnly.sort((a, b) => a.cost - b.cost);
        } else if (allFetched.length > 0) {
          options = allFetched.sort((a, b) => a.cost - b.cost);
        } else {
          options = this.generateDeterministicMockRates(rawOriginId, rawDestId, effectiveWeight, courierKey);
        }
      } catch (err) {
        console.warn('[RajaOngkir Cost API Error -> Graceful Fallback to Deterministic]', err);
        options = this.generateDeterministicMockRates(rawOriginId, rawDestId, effectiveWeight, courierKey);
      }
    }

    // 2. Simpan ke cache (TTL: 30 menit)
    try {
      await prisma.shippingCache.upsert({
        where: { cacheKey },
        update: {
          data: options as any,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
        create: {
          cacheKey,
          data: options as any,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
    } catch {
      // Abaikan jika gagal simpan cache
    }

    return options;
  }

  private generateDeterministicMockRates(
    originId: string,
    destinationId: string,
    weightGram: number,
    courier: string
  ): ShippingCostOption[] {
    const kg = Math.max(1, Math.ceil(weightGram / 1000));
    // Jika origin dan destination sama-sama di satu wilayah
    const isSameRegion =
      originId === destinationId ||
      destinationId.startsWith(originId.slice(0, 3)) ||
      (originId.startsWith('259') && destinationId.startsWith('259')) ||
      (originId.startsWith('314') && (destinationId.startsWith('314') || destinationId.startsWith('315')));
    const baseMultiplier = isSameRegion ? 1 : 1.8;
    const c = courier.toLowerCase();

    if (c === 'all') {
      const allMock = [
        ...this.generateDeterministicMockRates(originId, destinationId, weightGram, 'sicepat'),
        ...this.generateDeterministicMockRates(originId, destinationId, weightGram, 'jnt'),
        ...this.generateDeterministicMockRates(originId, destinationId, weightGram, 'jne'),
      ];
      return allMock.sort((a, b) => a.cost - b.cost);
    }

    if (c === 'jne') {
      return [
        {
          courier: 'JNE',
          service: 'REG',
          description: 'Layanan Reguler',
          cost: Math.round(9000 * baseMultiplier * kg),
          etd: isSameRegion ? '1-2 HARI' : '2-3 HARI',
        },
        {
          courier: 'JNE',
          service: 'YES',
          description: 'Yakin Esok Sampai',
          cost: Math.round(18000 * baseMultiplier * kg),
          etd: '1 HARI',
        },
        {
          courier: 'JNE',
          service: 'OKE',
          description: 'Ongkos Kirim Ekonomis',
          cost: Math.round(7000 * baseMultiplier * kg),
          etd: isSameRegion ? '2-3 HARI' : '3-5 HARI',
        },
      ];
    }

    if (c === 'sicepat') {
      return [
        {
          courier: 'SICEPAT',
          service: 'HALU',
          description: 'Harga Mulai Lima Ribu',
          cost: Math.round(7500 * baseMultiplier * kg),
          etd: isSameRegion ? '2-3 HARI' : '3-5 HARI',
        },
        {
          courier: 'SICEPAT',
          service: 'REG',
          description: 'SiCepat Reguler',
          cost: Math.round(8000 * baseMultiplier * kg),
          etd: isSameRegion ? '1-2 HARI' : '2-3 HARI',
        },
        {
          courier: 'SICEPAT',
          service: 'BEST',
          description: 'Besok Sampai Tujuan',
          cost: Math.round(15000 * baseMultiplier * kg),
          etd: '1 HARI',
        },
      ];
    }

    if (c === 'jnt') {
      return [
        {
          courier: 'JNT',
          service: 'EZ',
          description: 'J&T EZ Reguler',
          cost: Math.round(8000 * baseMultiplier * kg),
          etd: isSameRegion ? '1-2 HARI' : '2-3 HARI',
        },
      ];
    }

    // Default umum (POS / TIKI / ANTERAJA / kurir lain)
    return [
      {
        courier: courier.toUpperCase(),
        service: 'REG',
        description: 'Layanan Reguler',
        cost: Math.round(9500 * baseMultiplier * kg),
        etd: isSameRegion ? '1-2 HARI' : '2-4 HARI',
      },
    ];
  }
}

export const rajaOngkirService = new RajaOngkirService();

export async function calculateShippingRates(input: CalculateShippingInput): Promise<ShippingCostOption[]> {
  return rajaOngkirService.calculateCost(input);
}
