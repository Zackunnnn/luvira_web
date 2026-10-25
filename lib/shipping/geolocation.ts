// lib/shipping/geolocation.ts
// ============================================================================
// Layanan Reverse Geocoding GPS & Deteksi Lokasi Otomatis Device
// Mengubah koordinat GPS (latitude, longitude) menjadi alamat lengkap Indonesia
// (Provinsi, Kota/Kabupaten, Kecamatan, Kelurahan, Kode Pos, dan Nama Jalan)
// Sesuai integrasi RajaOngkir & Order Routing Luvira 2.0
// ============================================================================

import {
  MOCK_PROVINCES,
  MOCK_CITIES,
  MOCK_DISTRICTS,
  MOCK_SUBDISTRICTS,
  rajaOngkirService,
} from './rajaongkir';

export interface ReverseGeocodeResult {
  provinceId: string;
  provinceName: string;
  cityId: string;
  cityName: string;
  districtId: string;
  districtName: string;
  subDistrictId: string;
  subDistrictName: string;
  postalCode: string;
  street: string;
  formattedAddress: string;
}

function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/(daerah istimewa|d\.i\.|kota|kabupaten|kab\.|kecamatan|kec\.|kelurahan|kel\.)/gi, '')
    .trim();
}

/**
 * Reverse geocode latitude and longitude to Indonesian destination
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  let detectedRoad = '';
  let detectedSuburb = '';
  let detectedDistrict = '';
  let detectedCity = '';
  let detectedState = '';
  let detectedPostcode = '';

  // 1. Coba OpenStreetMap Nominatim terlebih dahulu
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'LuviraStore/2.0 (cs@luvira.id)',
          'Accept-Language': 'id,en',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      detectedRoad = addr.road || addr.pedestrian || addr.neighbourhood || '';
      detectedSuburb = addr.suburb || addr.village || addr.hamlet || '';
      detectedDistrict = addr.city_district || addr.district || addr.subdistrict || '';
      detectedCity = addr.city || addr.county || addr.municipality || addr.regency || '';
      detectedState = addr.state || '';
      detectedPostcode = addr.postcode || '';
    }
  } catch (err) {
    console.warn('[Geolocation] Nominatim lookup failed or timed out:', err);
  }

  // 2. Fallback ke BigDataCloud jika data belum lengkap
  if (!detectedCity || !detectedState) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=id`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (!detectedCity) detectedCity = data.city || data.locality || '';
        if (!detectedState) detectedState = data.principalSubdivision || '';
        if (!detectedPostcode) detectedPostcode = data.postcode || '';

        if (!detectedDistrict && data.localityInfo?.administrative) {
          const adm = data.localityInfo.administrative;
          const distObj = adm.find((a: any) => a.adminLevel === 6 || a.description?.includes('kecamatan'));
          if (distObj) detectedDistrict = distObj.name;
        }
      }
    } catch (err) {
      console.warn('[Geolocation] BigDataCloud fallback failed:', err);
    }
  }

  if (!detectedState && !detectedCity) {
    return null;
  }

  // 3. Cocokkan ke database RajaOngkir
  const provinces = await rajaOngkirService.getProvinces();
  const cleanState = cleanString(detectedState);

  // Cari provinsi yang paling cocok
  let matchedProvince = provinces.find(
    (p) => cleanString(p.name) === cleanState || p.name.toLowerCase().includes(cleanState) || cleanState.includes(cleanString(p.name))
  );

  if (!matchedProvince) {
    matchedProvince = provinces.find((p) =>
      cleanState.includes('yogyakarta') ? p.name.includes('Yogyakarta') : cleanState.includes('jakarta') ? p.name.includes('Jakarta') : false
    ) || provinces[0];
  }

  // Cari kota yang paling cocok di dalam provinsi tersebut
  const cities = await rajaOngkirService.getCities(matchedProvince.id);
  const cleanCity = cleanString(detectedCity);

  let matchedCity = cities.find(
    (c) => cleanString(c.name) === cleanCity || c.name.toLowerCase().includes(cleanCity) || cleanCity.includes(cleanString(c.name))
  );

  if (!matchedCity && cities.length > 0) {
    matchedCity = cities[0];
  }

  // Cari kecamatan
  let matchedDistrict: any = null;
  if (matchedCity) {
    const districts = await rajaOngkirService.getDistricts(matchedCity.id);
    const cleanDist = cleanString(detectedDistrict);
    matchedDistrict = districts.find(
      (d) => cleanString(d.name) === cleanDist || d.name.toLowerCase().includes(cleanDist) || cleanDist.includes(cleanString(d.name))
    );
    if (!matchedDistrict && districts.length > 0) {
      matchedDistrict = districts[0];
    }
  }

  // Cari kelurahan & kode pos
  let matchedSubDistrict: any = null;
  if (matchedDistrict) {
    const subdistricts = await rajaOngkirService.getSubDistricts(matchedDistrict.id);
    const cleanSub = cleanString(detectedSuburb);
    matchedSubDistrict = subdistricts.find(
      (sd) => cleanString(sd.name) === cleanSub || sd.name.toLowerCase().includes(cleanSub) || cleanSub.includes(cleanString(sd.name))
    );
    if (!matchedSubDistrict && subdistricts.length > 0) {
      matchedSubDistrict = subdistricts[0];
    }
  }

  const finalProvinceId = matchedProvince ? matchedProvince.id : '34';
  const finalProvinceName = matchedProvince ? matchedProvince.name : detectedState || 'DI Yogyakarta';
  const finalCityId = matchedCity ? matchedCity.id : '501';
  const finalCityName = matchedCity ? matchedCity.name : detectedCity || 'Kota Yogyakarta';
  const finalDistrictId = matchedDistrict ? matchedDistrict.id : `${finalCityId}1`;
  const finalDistrictName = matchedDistrict ? matchedDistrict.name : detectedDistrict || 'Danurejan';
  const finalSubDistrictId = matchedSubDistrict ? matchedSubDistrict.id : `${finalDistrictId}1`;
  const finalSubDistrictName = matchedSubDistrict ? matchedSubDistrict.name : detectedSuburb || 'Suryatmajan';
  const finalPostalCode = matchedSubDistrict?.postalCode || detectedPostcode || matchedCity?.postalCode || '55213';

  const parts = [
    detectedRoad,
    finalSubDistrictName,
    finalDistrictName,
    finalCityName,
    finalProvinceName,
    finalPostalCode,
  ].filter(Boolean);

  return {
    provinceId: finalProvinceId,
    provinceName: finalProvinceName,
    cityId: finalCityId,
    cityName: finalCityName,
    districtId: finalDistrictId,
    districtName: finalDistrictName,
    subDistrictId: finalSubDistrictId,
    subDistrictName: finalSubDistrictName,
    postalCode: finalPostalCode,
    street: detectedRoad ? `${detectedRoad}` : '',
    formattedAddress: parts.join(', '),
  };
}
