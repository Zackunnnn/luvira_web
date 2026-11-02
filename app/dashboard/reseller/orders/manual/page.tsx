import CreateManualOrderForm from '@/components/orders/CreateManualOrderForm';

export const metadata = {
  title: 'Buat Pesanan Manual (COD) | Reseller Luvira',
};

export default function ResellerManualOrderPage() {
  return (
    <div className="min-h-screen bg-stone-50/50 py-8">
      <CreateManualOrderForm backUrl="/dashboard/reseller" />
    </div>
  );
}

