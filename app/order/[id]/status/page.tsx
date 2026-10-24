// app/order/[id]/status/page.tsx
// ============================================================================
// Halaman Status & Unggah Bukti Pembayaran Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 5.3, E2E-01, E2E-02, E2E-03
// ============================================================================

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  AlertCircle,
  Copy,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import OrderStatusClientView from './OrderStatusClientView';
import { generateOrderHelpWhatsAppUrl } from '@/lib/whatsapp';

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Cari berdasarkan id atau code
  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id }, { code: id }],
    },
    include: {
      items: true,
      region: true,
      statusLogs: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const helpUrl = generateOrderHelpWhatsAppUrl(order.code);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 pb-16">
      {/* Top Bar */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="font-serif text-lg font-bold tracking-wider text-stone-900">
            LUVIRA
          </Link>
          <div className="flex items-center space-x-2 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span className="hidden sm:inline">Transaksi Aman & Terverifikasi</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <OrderStatusClientView order={order} whatsappHelpUrl={helpUrl} />
      </main>
    </div>
  );
}
