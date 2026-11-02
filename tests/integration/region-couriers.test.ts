// tests/integration/region-couriers.test.ts
// ============================================================================
// Test Suite: Regional Courier Control (Admin Pusat & Shipping Calculation)
// ============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';
import { GET as getLocations, PUT as putLocations } from '@/app/api/admin/locations/route';
import { POST as calculateShipping } from '@/app/api/shipping/calculate/route';
import { createSession } from '@/lib/auth';
import { Role } from '@prisma/client';

describe('Regional Courier Control per Wilayah Gudang', () => {
  let adminPusatUser: any;
  let adminJogjaUser: any;
  let resellerUser: any;
  let pusatRegion: any;
  let jogjaRegion: any;
  let testProduct: any;
  let testVariant: any;

  let adminPusatCookie: string;
  let adminJogjaCookie: string;
  let resellerCookie: string;

  beforeAll(async () => {
    pusatRegion = await prisma.region.findFirst({ where: { type: 'PUSAT' } });
    jogjaRegion = await prisma.region.findFirst({ where: { code: 'YOGYAKARTA' } });

    if (!pusatRegion || !jogjaRegion) {
      throw new Error('Wilayah Pusat atau Yogyakarta tidak ditemukan di database.');
    }

    // Get or create users
    adminPusatUser = await prisma.user.findFirst({ where: { role: Role.ADMIN_PUSAT } });
    if (!adminPusatUser) {
      adminPusatUser = await prisma.user.create({
        data: {
          email: 'admin.pusat.courier.test@luvira.id',
          name: 'Admin Pusat Courier Test',
          passwordHash: 'dummy',
          role: Role.ADMIN_PUSAT,
          regionId: pusatRegion.id,
        },
      });
    }

    adminJogjaUser = await prisma.user.findFirst({
      where: { role: Role.ADMIN_WILAYAH, regionId: jogjaRegion.id },
    });
    if (!adminJogjaUser) {
      adminJogjaUser = await prisma.user.create({
        data: {
          email: 'admin.jogja.courier.test@luvira.id',
          name: 'Admin Jogja Courier Test',
          passwordHash: 'dummy',
          role: Role.ADMIN_WILAYAH,
          regionId: jogjaRegion.id,
        },
      });
    }

    resellerUser = await prisma.user.findFirst({ where: { role: Role.RESELLER } });
    if (!resellerUser) {
      resellerUser = await prisma.user.create({
        data: {
          email: 'reseller.courier.test@luvira.id',
          name: 'Reseller Courier Test',
          passwordHash: 'dummy',
          role: Role.RESELLER,
          regionId: jogjaRegion.id,
        },
      });
    }

    const tokenPusat = await createSession({
      userId: adminPusatUser.id,
      email: adminPusatUser.email,
      name: adminPusatUser.name,
      role: adminPusatUser.role,
      regionId: adminPusatUser.regionId,
    });
    adminPusatCookie = `luvira_session=${tokenPusat}`;

    const tokenJogja = await createSession({
      userId: adminJogjaUser.id,
      email: adminJogjaUser.email,
      name: adminJogjaUser.name,
      role: adminJogjaUser.role,
      regionId: adminJogjaUser.regionId,
    });
    adminJogjaCookie = `luvira_session=${tokenJogja}`;

    const tokenReseller = await createSession({
      userId: resellerUser.id,
      email: resellerUser.email,
      name: resellerUser.name,
      role: resellerUser.role,
      regionId: resellerUser.regionId,
    });
    resellerCookie = `luvira_session=${tokenReseller}`;

    // Test product for shipping calculation
    testProduct = await prisma.product.create({
      data: {
        name: 'Kaus Kaki Ekspedisi Test',
        slug: `kaus-kaki-ekspedisi-${Date.now()}`,
        price: 45000,
        description: 'Test product for courier testing',
        model: 'ANKLE',
      },
    });

    testVariant = await prisma.productVariant.create({
      data: {
        productId: testProduct.id,
        name: 'Varian Kurir',
        hex: '#000000',
        imageUrl: '/socks/placeholder.webp',
        sku: `KURIR-${Date.now()}`,
        weightGram: 40,
      },
    });

    // Stock in Jogja
    await prisma.stock.upsert({
      where: {
        variantId_regionId: {
          regionId: jogjaRegion.id,
          variantId: testVariant.id,
        },
      },
      update: { qty: 100 },
      create: {
        regionId: jogjaRegion.id,
        variantId: testVariant.id,
        qty: 100,
      },
    });
  });

  afterAll(async () => {
    // Restore Jogja region couriers
    if (jogjaRegion) {
      await prisma.region.update({
        where: { id: jogjaRegion.id },
        data: { activeCouriers: ['jne', 'sicepat', 'jnt'] },
      });
    }

    // Cleanup product & variant
    if (testVariant) {
      await prisma.stock.deleteMany({ where: { variantId: testVariant.id } });
      await prisma.productVariant.delete({ where: { id: testVariant.id } });
    }
    if (testProduct) {
      await prisma.product.delete({ where: { id: testProduct.id } });
    }
  });

  it('TC-RC-01: Admin Pusat can fetch all regions including activeCouriers', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/locations', {
      headers: { cookie: adminPusatCookie },
    });
    const res = await getLocations(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.regions).toBeDefined();
    expect(data.regions.length).toBeGreaterThanOrEqual(2);

    const jogja = data.regions.find((r: any) => r.id === jogjaRegion.id);
    expect(jogja).toBeDefined();
    expect(Array.isArray(jogja.activeCouriers)).toBe(true);
  });

  it('TC-RC-02: Admin Pusat can set activeCouriers for Yogyakarta to J&T only', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/locations', {
      method: 'PUT',
      headers: {
        cookie: adminPusatCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: jogjaRegion.id,
        activeCouriers: ['jnt'],
      }),
    });
    const res = await putLocations(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.region.activeCouriers).toEqual(['jnt']);

    // Verify directly in DB
    const dbJogja = await prisma.region.findUnique({ where: { id: jogjaRegion.id } });
    expect(dbJogja?.activeCouriers).toEqual(['jnt']);
  });

  it('TC-RC-03: Validation rejects empty activeCouriers array (minimum 1 required)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/locations', {
      method: 'PUT',
      headers: {
        cookie: adminPusatCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: jogjaRegion.id,
        activeCouriers: [],
      }),
    });
    const res = await putLocations(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Setidaknya satu kurir ekspedisi harus diaktifkan');
  });

  it('TC-RC-04: Validation rejects unsupported couriers', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/locations', {
      method: 'PUT',
      headers: {
        cookie: adminPusatCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: jogjaRegion.id,
        activeCouriers: ['unknown_courier_xyz'],
      }),
    });
    const res = await putLocations(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Kurir tidak valid');
  });

  it('TC-RC-05: Reseller cannot update region settings (Forbidden 403)', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/locations', {
      method: 'PUT',
      headers: {
        cookie: resellerCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: jogjaRegion.id,
        activeCouriers: ['jne'],
      }),
    });
    const res = await putLocations(req);
    expect(res.status).toBe(403);
  });

  it('TC-RC-06: Shipping calculation filters rates strictly to active couriers (only J&T)', async () => {
    // When destination is Yogyakarta, order is handled by Yogyakarta warehouse
    const req = new NextRequest('http://localhost:3000/api/shipping/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: {
          provinceName: 'DI Yogyakarta',
          cityName: 'Kota Yogyakarta',
          districtName: 'Danurejan',
          subDistrictId: '31405',
        },
        items: [
          {
            productId: testProduct.id,
            variantId: testVariant.id,
            quantity: 2,
          },
        ],
        courier: 'all',
      }),
    });

    const res = await calculateShipping(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.originRegion.id).toBe(jogjaRegion.id);

    // Verify all returned rates are J&T only!
    expect(data.rates.length).toBeGreaterThan(0);
    for (const rate of data.rates) {
      expect(rate.courier.toLowerCase()).toBe('jnt');
    }
  });

  it('TC-RC-07: Restoring active couriers to JNE, SiCepat, J&T enables all 3 couriers again', async () => {
    const putReq = new NextRequest('http://localhost:3000/api/admin/locations', {
      method: 'PUT',
      headers: {
        cookie: adminPusatCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: jogjaRegion.id,
        activeCouriers: ['jne', 'sicepat', 'jnt'],
      }),
    });
    const putRes = await putLocations(putReq);
    expect(putRes.status).toBe(200);

    // Calculate shipping again
    const calcReq = new NextRequest('http://localhost:3000/api/shipping/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: {
          provinceName: 'DI Yogyakarta',
          cityName: 'Kota Yogyakarta',
          subDistrictId: '31405',
        },
        items: [
          {
            productId: testProduct.id,
            variantId: testVariant.id,
            quantity: 2,
          },
        ],
        courier: 'all',
      }),
    });

    const calcRes = await calculateShipping(calcReq);
    expect(calcRes.status).toBe(200);
    const data = await calcRes.json();
    expect(data.success).toBe(true);

    const couriers = new Set(data.rates.map((r: any) => r.courier.toLowerCase()));
    expect(couriers.has('jne')).toBe(true);
    expect(couriers.has('sicepat')).toBe(true);
    expect(couriers.has('jnt')).toBe(true);
  });
});
