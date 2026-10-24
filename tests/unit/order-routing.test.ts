// tests/unit/order-routing.test.ts
import { test, expect } from 'vitest';
import { resolveTargetRegion } from '@/lib/orders/order-routing';
import { prisma } from '@/lib/db';

test('Order Routing: Alamat DIY diarahkan ke Region Yogyakarta (A10)', async () => {
  const regionJogja = await resolveTargetRegion({
    provinceName: 'DI Yogyakarta',
    cityName: 'Kota Yogyakarta',
  });

  expect(regionJogja).toBeDefined();
  expect(regionJogja.code).toBe('YOGYAKARTA');
});

test('Order Routing: Alamat di luar DIY diarahkan ke Region Pusat (Depok) (A10)', async () => {
  const regionJabar = await resolveTargetRegion({
    provinceName: 'Jawa Barat',
    cityName: 'Kota Bandung',
  });
  expect(regionJabar.code).toBe('PUSAT');

  const regionJakarta = await resolveTargetRegion({
    provinceName: 'DKI Jakarta',
    cityName: 'Jakarta Selatan',
  });
  expect(regionJakarta.code).toBe('PUSAT');

  const regionLuarJawa = await resolveTargetRegion({
    provinceName: 'Sumatera Utara',
    cityName: 'Medan',
  });
  expect(regionLuarJawa.code).toBe('PUSAT');
});
