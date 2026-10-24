// tests/e2e/buyer/e2e-13-address-combobox.spec.ts
import { test, expect } from '@playwright/test';

test.describe('E2E-13: Form Alamat Cascading Combobox & Quick Search', () => {
  test('Pencarian cepat mengisi kelurahan, kecamatan, kota, provinsi, dan kode pos', async ({ request }) => {
    // 1. Quick search debounce query
    const resQuick = await request.get('/api/shipping/destinations?type=quick&q=Kemirimuka');
    expect(resQuick.ok()).toBe(true);
    const jsonQuick = await resQuick.json();

    expect(jsonQuick.success).toBe(true);
    expect(jsonQuick.data.length).toBeGreaterThan(0);

    const first = jsonQuick.data[0];
    expect(first.subDistrictName).toBe('Kemirimuka');
    expect(first.districtName).toBe('Beji');
    expect(first.cityName).toBe('Kota Depok');
    expect(first.provinceName).toBe('Jawa Barat');
    expect(first.postalCode).toBe('16423');
  });

  test('Pencarian bertingkat: Provinsi -> Kota -> Kecamatan -> Kelurahan', async ({ request }) => {
    // A. Provinsi
    const resProv = await request.get('/api/shipping/destinations?type=provinces');
    expect(resProv.ok()).toBe(true);
    const provs = (await resProv.json()).data;
    expect(provs.some((p: any) => p.name === 'DI Yogyakarta')).toBe(true);

    // B. Kota (DIY: id 34)
    const resCity = await request.get('/api/shipping/destinations?type=cities&provinceId=34');
    expect(resCity.ok()).toBe(true);
    const cities = (await resCity.json()).data;
    expect(cities.some((c: any) => c.name.includes('Yogyakarta'))).toBe(true);

    // C. Kecamatan (Kota Jogja: id 501)
    const resDist = await request.get('/api/shipping/destinations?type=districts&cityId=501');
    expect(resDist.ok()).toBe(true);
    const districts = (await resDist.json()).data;
    expect(districts.some((d: any) => d.name === 'Danurejan')).toBe(true);

    // D. Kelurahan (Danurejan: id 5011)
    const resSub = await request.get('/api/shipping/destinations?type=subdistricts&districtId=5011');
    expect(resSub.ok()).toBe(true);
    const subDistricts = (await resSub.json()).data;
    expect(subDistricts.some((sd: any) => sd.postalCode === '55213')).toBe(true);
  });
});
