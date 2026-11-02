import CreateManualOrderForm from '@/components/orders/CreateManualOrderForm';

export const metadata = {
  title: 'Buat Pesanan Manual (COD) | Admin Luvira',
};

export default function AdminManualOrderPage() {
  return (
    <div className="min-h-screen bg-stone-50/50 py-8">
      <CreateManualOrderForm backUrl="/dashboard/admin" />
    </div>
  );
}
