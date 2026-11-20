import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CATEGORIES,
  CATEGORY_LABEL_MAP,
  deriveCategoriesFromProducts,
} from '@/store/useProductStore';
import { MOCK_PRODUCTS } from '@/data/products';
import { Product } from '@/types/product';

describe('Product Filter & Categories Specification (20 Nov 2026)', () => {
  it('DEFAULT_CATEGORIES harus memiliki tepat 5 entri dalam urutan baku yang benar', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(5);

    expect(DEFAULT_CATEGORIES[0]).toEqual({
      id: 'emboss',
      label: 'Emboss',
      iconName: 'Sparkles',
    });

    expect(DEFAULT_CATEGORIES[1]).toEqual({
      id: 'emboss-split-toe',
      label: 'Emboss Split Toe',
      iconName: 'Sparkles',
    });

    expect(DEFAULT_CATEGORIES[2]).toEqual({
      id: 'black-sole',
      label: 'Black Sole',
      iconName: 'Layers',
    });

    expect(DEFAULT_CATEGORIES[3]).toEqual({
      id: 'black-sole-split-toe',
      label: 'Black Sole Split Toe',
      iconName: 'Layers',
    });

    expect(DEFAULT_CATEGORIES[4]).toEqual({
      id: 'anti-slip-split-toe',
      label: 'Anti-Slip Split Toe',
      iconName: 'ShieldCheck',
    });
  });

  it('CATEGORY_LABEL_MAP harus memetakan kelima model dengan benar', () => {
    expect(CATEGORY_LABEL_MAP['emboss']?.label).toBe('Emboss');
    expect(CATEGORY_LABEL_MAP['emboss-split-toe']?.label).toBe('Emboss Split Toe');
    expect(CATEGORY_LABEL_MAP['black-sole']?.label).toBe('Black Sole');
    expect(CATEGORY_LABEL_MAP['black-sole-split-toe']?.label).toBe('Black Sole Split Toe');
    expect(CATEGORY_LABEL_MAP['anti-slip-split-toe']?.label).toBe('Anti-Slip Split Toe');
  });

  it('deriveCategoriesFromProducts menurunkan kategori hanya dari produk yang benar-benar ada', () => {
    const subsetProducts: Product[] = [
      { ...MOCK_PRODUCTS[0], model: 'emboss' },
      { ...MOCK_PRODUCTS[1], model: 'anti-slip-split-toe' },
    ];

    const categories = deriveCategoriesFromProducts(subsetProducts);
    expect(categories).toHaveLength(2);
    expect(categories.map((c) => c.id)).toEqual(['emboss', 'anti-slip-split-toe']);
  });

  it('deriveCategoriesFromProducts pada MOCK_PRODUCTS menghasilkan 5 kategori lengkap sesuai urutan', () => {
    const categories = deriveCategoriesFromProducts(MOCK_PRODUCTS);
    expect(categories).toHaveLength(5);
    expect(categories.map((c) => c.id)).toEqual([
      'emboss',
      'emboss-split-toe',
      'black-sole',
      'black-sole-split-toe',
      'anti-slip-split-toe',
    ]);
  });

  it('Filter koleksi di homepage menghasilkan tepat 1 produk per kategori', () => {
    // 1. Semua Koleksi
    const all = MOCK_PRODUCTS.filter(() => true);
    expect(all).toHaveLength(5);

    // 2. Emboss
    const emboss = MOCK_PRODUCTS.filter((p) => p.model === 'emboss');
    expect(emboss).toHaveLength(1);
    expect(emboss[0].variants).toHaveLength(5);

    // 3. Emboss Split Toe
    const embossSplit = MOCK_PRODUCTS.filter((p) => p.model === 'emboss-split-toe');
    expect(embossSplit).toHaveLength(1);
    expect(embossSplit[0].variants).toHaveLength(7);

    // 4. Black Sole
    const blackSole = MOCK_PRODUCTS.filter((p) => p.model === 'black-sole');
    expect(blackSole).toHaveLength(1);
    expect(blackSole[0].variants).toHaveLength(3);

    // 5. Black Sole Split Toe
    const blackSoleSplit = MOCK_PRODUCTS.filter((p) => p.model === 'black-sole-split-toe');
    expect(blackSoleSplit).toHaveLength(1);
    expect(blackSoleSplit[0].variants).toHaveLength(8);

    // 6. Anti-Slip Split Toe
    const antiSlipSplit = MOCK_PRODUCTS.filter((p) => p.model === 'anti-slip-split-toe');
    expect(antiSlipSplit).toHaveLength(1);
    expect(antiSlipSplit[0].variants).toHaveLength(3);
  });
});
