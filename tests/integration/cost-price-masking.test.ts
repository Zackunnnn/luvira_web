// tests/integration/cost-price-masking.test.ts
// ============================================================================
// Integration Test: Proteksi Harga Modal (ProductCost Masking)
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 4 & 7
// ============================================================================

import { describe, it, expect } from 'vitest';
import { canViewCostPrice, maskProductCost, AuthUser } from '@/lib/permissions';
import { Role } from '@prisma/client';

describe('Integrasi: Proteksi Harga Modal (Cost Price Masking)', () => {
  const buyerUser: AuthUser = { id: 'u-buyer', role: 'BUYER' };
  const adminPusat: AuthUser = { id: 'u-pusat', role: Role.ADMIN_PUSAT, regionId: 'reg-pusat' };
  const adminJogja: AuthUser = { id: 'u-jogja', role: Role.ADMIN_WILAYAH, regionId: 'reg-jogja' };
  const ownerUser: AuthUser = { id: 'u-owner', role: Role.OWNER };
  const devUser: AuthUser = { id: 'u-dev', role: Role.DEVELOPER };

  const mockDbProductWithCost = {
    id: 'prod-emboss-1',
    name: 'Emboss Split Toe All Variant',
    price: 35000,
    costPrice: 15000,
    packingCost: 2000,
    cost: {
      costPrice: 15000,
      packingCost: 2000,
    },
    variants: [
      {
        id: 'var-1',
        name: 'Cudpahnut',
        sku: 'LVR-EMBO-CUDP-EST6',
        cost: {
          costPrice: 15000,
          packingCost: 2000,
        },
      },
    ],
  };

  it('canViewCostPrice hanya mengembalikan true untuk Owner dan Developer', () => {
    expect(canViewCostPrice(buyerUser)).toBe(false);
    expect(canViewCostPrice(null)).toBe(false);
    expect(canViewCostPrice(adminPusat)).toBe(false);
    expect(canViewCostPrice(adminJogja)).toBe(false);

    expect(canViewCostPrice(ownerUser)).toBe(true);
    expect(canViewCostPrice(devUser)).toBe(true);
  });

  it('Admin Pusat dan Admin Wilayah tidak pernah menerima data harga modal (costPrice, packingCost, cost object)', () => {
    const maskedPusat = maskProductCost(adminPusat, mockDbProductWithCost);
    expect(maskedPusat.costPrice).toBeUndefined();
    expect(maskedPusat.packingCost).toBeUndefined();
    expect(maskedPusat.cost).toBeUndefined();
    expect(maskedPusat.variants[0].cost).toBeUndefined();

    const maskedJogja = maskProductCost(adminJogja, mockDbProductWithCost);
    expect(maskedJogja.costPrice).toBeUndefined();
    expect(maskedJogja.packingCost).toBeUndefined();
    expect(maskedJogja.cost).toBeUndefined();
    expect(maskedJogja.variants[0].cost).toBeUndefined();
  });

  it('Owner dan Developer tetap menerima data harga modal secara utuh untuk laporan dan observabilitas', () => {
    const ownerResult = maskProductCost(ownerUser, mockDbProductWithCost);
    expect(ownerResult.costPrice).toBe(15000);
    expect(ownerResult.packingCost).toBe(2000);
    expect(ownerResult.cost).toBeDefined();

    const devResult = maskProductCost(devUser, mockDbProductWithCost);
    expect(devResult.costPrice).toBe(15000);
    expect(devResult.packingCost).toBe(2000);
    expect(devResult.cost).toBeDefined();
  });
});
