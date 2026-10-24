// tests/unit/shipping-rajaongkir.test.ts
import { test, expect } from 'vitest';
import { rajaOngkirService, MOCK_PROVINCES, MOCK_CITIES } from '@/lib/shipping/rajaongkir';

test('RajaOngkir Service: Mode Mock mengembalikan daftar provinsi dan kota lengkap', async () => {
  const provinces = await rajaOngkirService.getProvinces();
  expect(provinces.length).toBeGreaterThan(0);
  expect(provinces.some((p) => p.name.includes('DI Yogyakarta'))).toBe(true);
  expect(provinces.some((p) => p.name.includes('Jawa Barat'))).toBe(true);

  const jabarCities = await rajaOngkirService.getCities('32');
  expect(jabarCities.some((c) => c.name.includes('Depok'))).toBe(true);

  const diyCities = await rajaOngkirService.getCities('34');
  expect(diyCities.some((c) => c.name.includes('Yogyakarta'))).toBe(true);
});

test('RajaOngkir Service: Pencarian Cepat (Quick Search) menemukan kelurahan/kecamatan/kota', async () => {
  const resultsDepok = await rajaOngkirService.quickSearchDestination('Kemirimuka');
  expect(resultsDepok.length).toBeGreaterThan(0);
  expect(resultsDepok[0].cityName).toBe('Kota Depok');
  expect(resultsDepok[0].postalCode).toBe('16423');

  const resultsJogja = await rajaOngkirService.quickSearchDestination('Danurejan');
  expect(resultsJogja.length).toBeGreaterThan(0);
  expect(resultsJogja[0].cityName).toBe('Kota Yogyakarta');
});

test('RajaOngkir Service: Perhitungan tarif ongkir deterministik', async () => {
  // 1. Pengiriman dalam satu wilayah (Depok ke Depok)
  const ratesIntra = await rajaOngkirService.calculateCost({
    originId: '115',
    destinationId: '1151',
    weightGram: 100,
    courier: 'jne',
  });
  expect(ratesIntra.length).toBeGreaterThan(0);
  const regIntra = ratesIntra.find((r) => r.service === 'REG');
  expect(regIntra).toBeDefined();
  expect(regIntra?.cost).toBe(9000);

  // 2. Pengiriman antar wilayah (Depok ke Yogyakarta)
  const ratesInter = await rajaOngkirService.calculateCost({
    originId: '115',
    destinationId: '501',
    weightGram: 100,
    courier: 'jne',
  });
  const regInter = ratesInter.find((r) => r.service === 'REG');
  expect(regInter).toBeDefined();
  expect(regInter!.cost).toBeGreaterThan(regIntra!.cost);
});
