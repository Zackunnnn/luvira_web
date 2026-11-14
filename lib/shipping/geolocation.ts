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
    .replace(/(daerah khusus ibukota|daerah istimewa|d\.k\.i\.|dki|d\.i\.|kota administrasi|kabupaten administrasi|kota|kabupaten|kab\.|kecamatan|kec\.|kelurahan|kel\.)/gi, '')
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
  let detectedIsoCode = '';

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
      detectedIsoCode = addr['ISO3166-2-lvl4'] || '';

      // Khusus DKI Jakarta pada OpenStreetMap:
      // addr.city biasanya berisi "Daerah Khusus Ibukota Jakarta" sementara addr.state adalah undefined.
      // Jika terdeteksi Jakarta, tetapkan state langsung ke DKI Jakarta agar tidak tertimpa fallback Jawa
      const isJakartaOsm =
        detectedIsoCode === 'ID-JK' ||
        detectedCity.toLowerCase().includes('jakarta') ||
        detectedDistrict.toLowerCase().includes('jakarta') ||
        detectedState.toLowerCase().includes('jakarta');

      if (isJakartaOsm) {
        detectedState = 'DKI Jakarta';
        if (detectedDistrict && detectedDistrict.toLowerCase().includes('jakarta')) {
          detectedCity = detectedDistrict;
        } else if (!detectedDistrict && detectedSuburb) {
          detectedDistrict = detectedSuburb;
        }
      }
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
        if (!detectedState) {
          const rawSub = data.principalSubdivision || '';
          // Jangan gunakan nama pulau generik seperti "Jawa" atau "Sumatera" sebagai nama provinsi
          const GENERIC_ISLANDS = ['jawa', 'sumatera', 'kalimantan', 'sulawesi', 'papua', 'maluku'];
          if (!GENERIC_ISLANDS.includes(rawSub.toLowerCase().trim())) {
            detectedState = rawSub;
          }
        }
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
  const cleanCity = cleanString(detectedCity);
  const cleanDistrict = cleanString(detectedDistrict);

  // Periksa apakah lokasi berada di DKI Jakarta
  const isJakarta =
    detectedIsoCode === 'ID-JK' ||
    detectedState.toLowerCase().includes('jakarta') ||
    cleanState.includes('jakarta') ||
    cleanCity.includes('jakarta') ||
    cleanDistrict.includes('jakarta');

  let matchedProvince;
  if (isJakarta) {
    matchedProvince = provinces.find((p) => p.name.toLowerCase().includes('jakarta'));
  } else {
    matchedProvince = provinces.find(
      (p) =>
        cleanString(p.name) === cleanState ||
        p.name.toLowerCase().includes(cleanState) ||
        cleanState.includes(cleanString(p.name))
    );

    if (!matchedProvince) {
      matchedProvince = provinces.find((p) =>
        cleanState.includes('yogyakarta') ? p.name.toLowerCase().includes('yogyakarta') : false
      );
    }
  }

  // Jika provinsi masih belum cocok, coba cari provinsi berdasarkan nama kota
  if (!matchedProvince && cleanCity) {
    for (const prov of provinces) {
      const pCities = await rajaOngkirService.getCities(prov.id);
      if (pCities.some((c) => cleanString(c.name).includes(cleanCity) || cleanCity.includes(cleanString(c.name)))) {
        matchedProvince = prov;
        break;
      }
    }
  }

  if (!matchedProvince) {
    matchedProvince = provinces[0];
  }

  // Cari kota yang paling cocok di dalam provinsi tersebut
  const cities = await rajaOngkirService.getCities(matchedProvince.id);

  let matchedCity = cities.find(
    (c) =>
      cleanString(c.name) === cleanCity ||
      c.name.toLowerCase().includes(cleanCity) ||
      cleanCity.includes(cleanString(c.name))
  );

  // Khusus Jakarta: jika belum cocok persis, cocokkan berdasarkan bagian wilayah (Pusat, Selatan, Barat, Timur, Utara, Seribu)
  if (!matchedCity && isJakarta) {
    const combinedSearch = `${detectedDistrict} ${detectedCity} ${detectedSuburb}`.toLowerCase();
    matchedCity = cities.find((c) => {
      const cName = c.name.toLowerCase();
      if (combinedSearch.includes('pusat') && cName.includes('pusat')) return true;
      if (combinedSearch.includes('selatan') && cName.includes('selatan')) return true;
      if (combinedSearch.includes('barat') && cName.includes('barat')) return true;
      if (combinedSearch.includes('timur') && cName.includes('timur')) return true;
      if (combinedSearch.includes('utara') && cName.includes('utara')) return true;
      if (combinedSearch.includes('seribu') && cName.includes('seribu')) return true;
      return false;
    });

    if (!matchedCity) {
      // Default Jakarta Pusat untuk wilayah ibukota
      matchedCity = cities.find((c) => c.name.toLowerCase().includes('pusat')) || cities[0];
    }
  }

  if (!matchedCity && cities.length > 0) {
    matchedCity = cities[0];
  }

  // Cari kecamatan
  let matchedDistrict: any = null;
  if (matchedCity) {
    const districts = await rajaOngkirService.getDistricts(matchedCity.id);
    const cleanDist = cleanString(detectedDistrict);
    const cleanSub = cleanString(detectedSuburb);

    matchedDistrict = districts.find(
      (d) =>
        cleanString(d.name) === cleanDist ||
        d.name.toLowerCase().includes(cleanDist) ||
        cleanDist.includes(cleanString(d.name)) ||
        (cleanSub && (cleanString(d.name) === cleanSub || d.name.toLowerCase().includes(cleanSub)))
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
      (sd) =>
        cleanString(sd.name) === cleanSub ||
        sd.name.toLowerCase().includes(cleanSub) ||
        cleanSub.includes(cleanString(sd.name))
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
