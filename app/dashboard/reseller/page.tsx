// app/dashboard/reseller/page.tsx
// ============================================================================
// Halaman Dashboard Reseller Luvira 2.0 (FT-4)
// ============================================================================

import { Metadata } from 'next';
import ResellerDashboardClient from '@/components/reseller/ResellerDashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard Reseller | Luvira 2.0',
  description: 'Ringkasan penjualan, pesanan, dan kode promo reseller Luvira',
};

export default function ResellerDashboardPage() {
  return <ResellerDashboardClient />;
}
