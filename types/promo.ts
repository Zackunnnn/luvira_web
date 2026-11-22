// types/promo.ts
// ============================================================================
// Tipe data validasi promo Luvira 2.0 (Strictly Typed, No Any)
// ============================================================================

export interface PromoValidation {
  id?: string;
  code: string;
  type?: string;
  discountType: 'PERCENTAGE' | 'FIXED' | string;
  discountValue: number;
  maxDiscount?: number | null;
  maxDiscountAmount?: number | null;
  isFreeShipping?: boolean;
  isFreeTax?: boolean;
  regionId?: string | null;
  regionName?: string | null;
  kind?: string;
  isTest?: boolean;
}
