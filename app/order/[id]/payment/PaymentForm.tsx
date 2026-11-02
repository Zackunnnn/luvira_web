'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, CheckCircle2, Loader2, AlertCircle, FlaskConical } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PaymentForm({ order }: { order: any }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSuccess, setSimulationSuccess] = useState(false);

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    setError(null);
    try {
      const res = await fetch(`/api/test/orders/${order.id}/simulate-payment`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Simulasi pembayaran gagal.');
      }
      setSimulationSuccess(true);
      setTimeout(() => {
        router.push(`/order/${order.code || order.id}/track`);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  useEffect(() => {
    if (order.paymentMethod === 'midtrans' && order.status === 'menunggu_transfer') {
      const scriptUrl = process.env.NEXT_PUBLIC_MIDTRANS_ENV === 'production' 
        ? 'https://app.midtrans.com/snap/snap.js' 
        : 'https://app.sandbox.midtrans.com/snap/snap.js';
      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
      
      const script = document.createElement('script');
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

  if (order.isTest || order.paymentMethod === 'TEST_SIMULATION') {
    return (
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-purple-200 shadow-sm space-y-6">
        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 flex items-start gap-3">
          <FlaskConical className="w-5 h-5 text-purple-700 mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-800 bg-purple-200 px-2 py-0.5 rounded-full">
              [MODE PENGUJIAN]
            </span>
            <h3 className="text-sm font-bold text-purple-950 mt-1">Simulasi Pembayaran Promo Uji</h3>
            <p className="text-xs text-purple-800/90 mt-0.5 leading-relaxed">
              Pesanan ini menggunakan kode promo uji coba. Gateway Midtrans dilewati sepenuhnya dan Anda dapat menyimulasikan transaksi sukses secara gratis.
            </p>
          </div>
        </div>

        {/* QR Code Simulasi */}
        <div className="flex flex-col items-center justify-center p-6 bg-stone-50 rounded-2xl border border-stone-200 text-center space-y-3">
          <div className="p-3 bg-white rounded-xl shadow-xs border border-stone-200">
            <svg className="w-44 h-44 text-purple-900" viewBox="0 0 100 100" fill="currentColor">
              <rect x="5" y="5" width="25" height="25" fill="#581c87" rx="3" />
              <rect x="10" y="10" width="15" height="15" fill="#ffffff" rx="1" />
              <rect x="14" y="14" width="7" height="7" fill="#581c87" />

              <rect x="70" y="5" width="25" height="25" fill="#581c87" rx="3" />
              <rect x="75" y="10" width="15" height="15" fill="#ffffff" rx="1" />
              <rect x="79" y="14" width="7" height="7" fill="#581c87" />

              <rect x="5" y="70" width="25" height="25" fill="#581c87" rx="3" />
              <rect x="10" y="75" width="15" height="15" fill="#ffffff" rx="1" />
              <rect x="14" y="79" width="7" height="7" fill="#581c87" />

              <rect x="35" y="10" width="8" height="8" fill="#7e22ce" />
              <rect x="50" y="10" width="12" height="8" fill="#7e22ce" />
              <rect x="40" y="25" width="20" height="8" fill="#7e22ce" />
              <rect x="10" y="40" width="20" height="8" fill="#7e22ce" />
              <rect x="35" y="40" width="8" height="8" fill="#581c87" />
              <rect x="48" y="40" width="16" height="8" fill="#7e22ce" />
              <rect x="70" y="40" width="20" height="8" fill="#7e22ce" />
              <rect x="15" y="55" width="25" height="8" fill="#7e22ce" />
              <rect x="45" y="55" width="22" height="8" fill="#581c87" />
              <rect x="75" y="55" width="15" height="8" fill="#7e22ce" />
              <rect x="40" y="70" width="18" height="8" fill="#7e22ce" />
              <rect x="65" y="70" width="25" height="8" fill="#581c87" />
              <rect x="45" y="85" width="30" height="8" fill="#7e22ce" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-purple-900 bg-purple-100/70 px-3 py-1 rounded-md inline-block">
              {`LUVIRA-UJI:${order.code}`}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">Scan kode QR simulasi di atas atau tekan tombol simulasi di bawah</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {simulationSuccess && (
          <div className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl flex items-center gap-2 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Simulasi berhasil! Mengalihkan ke pelacakan pesanan...</span>
          </div>
        )}

        <Button
          onClick={handleSimulatePayment}
          disabled={isSimulating || simulationSuccess}
          fullWidth
          size="lg"
          className="bg-purple-800 hover:bg-purple-900 text-white font-bold py-3.5 rounded-2xl shadow-sm transition-all cursor-pointer"
        >
          {isSimulating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>Memproses Simulasi Bayar Sukses...</span>
            </>
          ) : (
            'Simulasikan Bayar Sukses'
          )}
        </Button>
      </div>
    );
  }

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
