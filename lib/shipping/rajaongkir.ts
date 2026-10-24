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

export const MOCK_SUBDISTRICTS: SubDistrict[] = [
  // Beji, Kota Depok
  { id: '11511', districtId: '1151', name: 'Kemirimuka', postalCode: '16423' },
  { id: '11512', districtId: '1151', name: 'Beji Timur', postalCode: '16422' },
  { id: '11513', districtId: '1151', name: 'Kukusan', postalCode: '16425' },

  // Danurejan, Yogyakarta
  { id: '50111', districtId: '5011', name: 'Suryatmajan', postalCode: '55213' },
  { id: '50112', districtId: '5011', name: 'Bausasran', postalCode: '55211' },

  // Depok, Sleman
  { id: '50211', districtId: '5021', name: 'Caturtunggal', postalCode: '55281' },
  { id: '50212', districtId: '5021', name: 'Maguwoharjo', postalCode: '55282' },
];

// ----------------------------------------------------------------------------
// ADAPTER IMPLEMENTATION
// ----------------------------------------------------------------------------

export class RajaOngkirService {
  private mode: 'mock' | 'live';
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.mode = (process.env.SHIPPING_MODE === 'live' ? 'live' : 'mock') as 'mock' | 'live';
    this.apiKey = process.env.RAJAONGKIR_API_KEY || '';
    this.baseUrl = process.env.RAJAONGKIR_URL || 'https://rajaongkir.komerce.id/api/v1';
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
        type: c.type,
        postalCode: c.postal_code,
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
        postalCode: sd.postal_code,
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

    if (this.mode === 'mock' || results.length > 0) {
      return results;
    }

    // Live search jika live mode
    try {
      const res = await fetch(`${this.baseUrl}/destination/domestic-destination?search=${encodeURIComponent(query)}`, {
        headers: { key: this.apiKey },
      });
      if (!res.ok) return results;
      const json = await res.json();
      return (json.data || []).map((item: any) => ({
        id: String(item.subdistrict_id || item.id),
        label: item.label,
        provinceId: String(item.province_id),
        provinceName: item.province_name,
        cityId: String(item.city_id),
        cityName: item.city_name,
        districtId: String(item.district_id),
        districtName: item.district_name,
        subDistrictId: String(item.subdistrict_id),
        subDistrictName: item.subdistrict_name,
        postalCode: item.zip_code,
      }));
    } catch {
      return results;
    }
  }

  async calculateCost(input: CalculateShippingInput): Promise<ShippingCostOption[]> {
    const { originId, destinationId, weightGram, courier } = input;
    const cacheKey = `ship:${originId}:${destinationId}:${weightGram}:${courier.toLowerCase()}`;

    // 1. Cek cache database
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

    let options: ShippingCostOption[] = [];

    if (this.mode === 'mock') {
      options = this.generateDeterministicMockRates(originId, destinationId, weightGram, courier);
    } else {
      try {
        const body = new URLSearchParams({
          origin: originId,
          destination: destinationId,
          weight: String(Math.max(1, weightGram)),
          courier: courier.toLowerCase(),
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

        if (!res.ok) {
          throw new Error(`RajaOngkir HTTP Error ${res.status}`);
        }

        const json = await res.json();
        const results = json.data?.[0]?.costs || [];
        options = results.map((c: any) => ({
          courier: courier.toUpperCase(),
          service: c.service,
          description: c.description,
          cost: c.cost?.[0]?.value || 10000,
          etd: c.cost?.[0]?.etd || '1-3 HARI',
        }));
      } catch (err) {
        console.warn('[RajaOngkir Cost API Error -> Graceful Fallback to Deterministic]', err);
        options = this.generateDeterministicMockRates(originId, destinationId, weightGram, courier);
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
    // Jika origin dan destination sama-sama di satu wilayah (misal 501 dan 501xx)
    const isSameRegion = originId === destinationId || destinationId.startsWith(originId.slice(0, 3));
    const baseMultiplier = isSameRegion ? 1 : 1.8;
    const c = courier.toLowerCase();

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
          service: 'SIUNT',
          description: 'SiUntung Reguler',
          cost: Math.round(10000 * baseMultiplier * kg),
          etd: isSameRegion ? '1-2 HARI' : '2-3 HARI',
        },
        {
          courier: 'SICEPAT',
          service: 'BEST',
          description: 'Besok Sampai Tujuan',
          cost: Math.round(19000 * baseMultiplier * kg),
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
          cost: Math.round(10000 * baseMultiplier * kg),
          etd: isSameRegion ? '1-2 HARI' : '2-3 HARI',
        },
      ];
    }

    // Default umum (POS / TIKI / kurir lain)
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
