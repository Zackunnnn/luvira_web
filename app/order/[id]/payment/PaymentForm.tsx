'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PaymentForm({ order }: { order: any }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (order.paymentMethod === 'midtrans' && order.status === 'menunggu_transfer') {
      const scriptUrl = process.env.NEXT_PUBLIC_MIDTRANS_ENV === 'production' 
        ? 'https://app.midtrans.com/snap/snap.js' 
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
      
      let script = document.createElement('script');
      script.src = scriptUrl;
      script.setAttribute('data-client-key', clientKey || '');
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }
  }, [order.paymentMethod, order.status]);

  const handlePayMidtrans = () => {
    if (window.snap && order.midtransToken) {
      window.snap.pay(order.midtransToken, {
        onSuccess: function () {
          router.refresh();
        },
        onPending: function () {
          router.refresh();
        },
        onError: function () {
          alert('Pembayaran gagal');
        },
        onClose: function () {
          router.refresh();
        }
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    try {
      // 1. Upload to ImageKit
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Gagal upload gambar');

      // 2. Update Order Status
      const updateRes = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'menunggu_verifikasi',
          paymentProofUrl: uploadData.url,
        }),
      });

      if (!updateRes.ok) throw new Error('Gagal memperbarui status pesanan');

      // 3. Refresh and Redirect
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (order.status !== 'menunggu_transfer') {
    return (
      <div className="bg-white p-8 rounded-3xl border border-deep-forest/10 text-center space-y-4 shadow-sm">
        <CheckCircle2 className="w-12 h-12 text-leaf-olive mx-auto" />
        <h2 className="text-xl font-bold text-deep-forest">Status Pembayaran</h2>
        <p className="text-sm text-muted-charcoal/70">
          Pesanan Anda tercatat dengan status: <strong className="uppercase">{order.status.replace('_', ' ')}</strong>
        </p>
      </div>
    );
  }

  if (order.paymentMethod === 'midtrans') {
    return (
      <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-6 text-center">
        <h2 className="text-lg font-bold text-deep-forest">Selesaikan Pembayaran Anda</h2>
        <p className="text-sm text-muted-charcoal/70">Silakan klik tombol di bawah untuk melanjutkan proses pembayaran otomatis via Midtrans.</p>
        <Button onClick={handlePayMidtrans} size="lg" fullWidth className="bg-deep-forest text-warm-cream">
          Bayar Sekarang
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl border border-deep-forest/10 shadow-sm space-y-6">
      <div className="border-b border-deep-forest/10 pb-4">
        <h2 className="text-lg font-bold text-deep-forest">Upload Bukti Transfer</h2>
        <p className="text-sm text-muted-charcoal/70">Silakan upload screenshot/foto bukti transfer Anda.</p>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-deep-forest/20 rounded-2xl p-8 text-center bg-gray-50 flex flex-col items-center gap-3">
          <Upload className="w-8 h-8 text-muted-charcoal/40" />
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-muted-charcoal file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-leaf-olive/10 file:text-leaf-olive hover:file:bg-leaf-olive/20"
          />
        </div>

        {error && (
          <div className="p-3 bg-dusty-rose/10 text-dusty-rose text-sm rounded-xl flex gap-2 items-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading} 
          fullWidth 
          size="lg"
          className="bg-deep-forest text-warm-cream"
        >
          {isUploading ? (
            <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Sedang Mengupload...</>
          ) : (
            'Kirim Bukti Transfer'
          )}
        </Button>
      </div>
    </div>
  );
}
