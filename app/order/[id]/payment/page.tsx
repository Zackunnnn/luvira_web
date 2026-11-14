import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import PaymentForm from './PaymentForm';
import BankAccountSelector from '@/components/checkout/BankAccountSelector';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrderPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const finalOrder = await prisma.order.findUnique({ 
    where: { id },
    include: { items: true }
  });

  if (!finalOrder) {
    notFound();
  }

  const invoiceNumber = finalOrder.id.toUpperCase().substring(0, 10);
  
  let itemsTotal = 0;
  finalOrder.items.forEach(item => {
    itemsTotal += (item.priceEach * item.quantity);
  });
  
  const totalPrice = itemsTotal + (finalOrder.shippingCost || 0) + (finalOrder.ppnAmount || 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-warm-cream flex flex-col">
      <div className="bg-deep-forest text-warm-cream p-4 flex justify-between items-center shadow-sm">
        <BrandLogo size="sm" theme="dark" asLink />
        <div className="flex items-center gap-1 text-[11px] font-bold text-leaf-olive bg-leaf-olive/20 px-2.5 py-1 rounded-full border border-leaf-olive/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Secure Payment Gate</span>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Detail Pesanan */}
        <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-4">
          <h1 className="text-xl font-black text-deep-forest border-b border-gray-100 pb-4">
            Konfirmasi Pembayaran
          </h1>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-charcoal/70">Kode Pesanan</span>
              <span className="font-mono font-bold text-deep-forest bg-warm-cream/60 px-2 py-0.5 rounded border border-leaf-olive/30">{finalOrder.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-charcoal/70">No. Invoice</span>
              <span className="font-bold text-deep-forest">{invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-charcoal/70">Nama Pemesan</span>
              <span className="font-semibold text-muted-charcoal">{finalOrder.customerName}</span>
            </div>
            {finalOrder.isTest || finalOrder.paymentMethod === 'TEST_SIMULATION' ? (
              <div className="bg-purple-50 p-3.5 rounded-xl text-xs text-purple-900 border border-purple-200 space-y-1 my-2">
                <div className="font-bold flex items-center gap-1.5 text-purple-950">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                  Pesanan Simulasi Sandbox / Promo Uji
                </div>
                <p className="text-purple-800/80">Metode bayar simulasi aktif. Tidak memerlukan transfer bank sungguhan.</p>
              </div>
            ) : (
              <BankAccountSelector />
            )}
            
            <div className="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-muted-charcoal">
                {finalOrder.isTest ? 'Total Simulasi' : 'Total Transfer'}
              </span>
              <span className="text-2xl font-black text-deep-forest">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>

          {(!finalOrder.isTest && finalOrder.paymentMethod !== 'TEST_SIMULATION') && (
            <div className="bg-amber-50 p-4 rounded-xl text-xs text-amber-800 mt-4 border border-amber-200">
              Pastikan Anda mentransfer tepat sejumlah <strong>{formatCurrency(totalPrice)}</strong> ke rekening yang tertera sebelum batas waktu habis.
            </div>
          )}
        </div>

        {/* Form Upload */}
        <PaymentForm order={finalOrder} />
      </div>
    </div>
  );
}
