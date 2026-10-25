// app/api/shipping/destinations/route.ts
// ============================================================================
// API Pencarian Wilayah Alamat Bertingkat & Quick Search (RajaOngkir Service)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 8.1 & Fase 2
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { rajaOngkirService } from '@/lib/shipping/rajaongkir';
import { reverseGeocodeCoordinates } from '@/lib/shipping/geolocation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'provinces';

    // 0. Deteksi Lokasi Otomatis dari Koordinat GPS Perangkat (Browser Geolocation)
    if (type === 'gps' || type === 'reverse-geocode') {
      const lat = parseFloat(searchParams.get('lat') || '');
      const lng = parseFloat(searchParams.get('lng') || '');

      if (isNaN(lat) || isNaN(lng)) {
        return NextResponse.json(
          { error: 'Parameter lat dan lng koordinat valid wajib disertakan' },
          { status: 400 }
        );
      }

      const geoResult = await reverseGeocodeCoordinates(lat, lng);
      if (!geoResult) {
        return NextResponse.json(
          { error: 'Tidak dapat mendeteksi nama wilayah dari koordinat ini' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: geoResult });
    }

    // 1. Pencarian Cepat (Quick Search / Autocomplete Debounced)
    if (type === 'quick') {
      const q = searchParams.get('q') || '';
      if (q.trim().length < 3) {
        return NextResponse.json({ success: true, data: [] });
      }
      const results = await rajaOngkirService.quickSearchDestination(q);
      return NextResponse.json({ success: true, data: results });
    }

    // 2. Daftar Provinsi
    if (type === 'provinces') {
      const provinces = await rajaOngkirService.getProvinces();
      return NextResponse.json({ success: true, data: provinces });
    }

    // 3. Daftar Kota berdasarkan ID Provinsi
    if (type === 'cities') {
      const provinceId = searchParams.get('provinceId');
      if (!provinceId) {
        return NextResponse.json({ error: 'provinceId is required' }, { status: 400 });
      }
      const cities = await rajaOngkirService.getCities(provinceId);
      return NextResponse.json({ success: true, data: cities });
    }

    // 4. Daftar Kecamatan berdasarkan ID Kota
    if (type === 'districts') {
      const cityId = searchParams.get('cityId');
      if (!cityId) {
        return NextResponse.json({ error: 'cityId is required' }, { status: 400 });
      }
      const districts = await rajaOngkirService.getDistricts(cityId);
      return NextResponse.json({ success: true, data: districts });
    }

    // 5. Daftar Kelurahan & Kode Pos berdasarkan ID Kecamatan
    if (type === 'subdistricts') {
      const districtId = searchParams.get('districtId');
      if (!districtId) {
        return NextResponse.json({ error: 'districtId is required' }, { status: 400 });
      }
      const subdistricts = await rajaOngkirService.getSubDistricts(districtId);
      return NextResponse.json({ success: true, data: subdistricts });
    }

    return NextResponse.json({ error: 'Invalid destination type parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('[API Shipping Destinations Error]', err);
    return NextResponse.json(
      { error: 'Gagal mengambil data wilayah', message: err.message },
      { status: 500 }
    );
  }
}
