'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Clock, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Package,
  MapPin,
  X
} from 'lucide-react';

interface OrdersTabProps {
  user: any;
  selectedOrderIdFromNotification?: string | null;
  onClearSelectedOrderId?: () => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  user,
  selectedOrderIdFromNotification,
  onClearSelectedOrderId,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSummary, setActionSummary] = useState({ needsVerification: 0, needsShipping: 0 });

  // Modals state
  const [verifModalOrder, setVerifModalOrder] = useState<any | null>(null);
  const [verifActionLoading, setVerifActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const [shipModalOrder, setShipModalOrder] = useState<any | null>(null);
  const [shipCourier, setShipCourier] = useState('JNE');
  const [shipResi, setShipResi] = useState('');
  const [shipError, setShipError] = useState('');
  const [shipActionLoading, setShipActionLoading] = useState(false);

  const [detailModalOrder, setDetailModalOrder] = useState<any | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/admin/orders?limit=100';
      if (statusFilter !== 'ALL') {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery.trim()) {
        url += `&query=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        if (data.summary) {
          setActionSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin orders', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle selected order from notification click
  useEffect(() => {
    if (selectedOrderIdFromNotification && orders.length > 0) {
      const match = orders.find((o) => o.id === selectedOrderIdFromNotification || o.code === selectedOrderIdFromNotification);
      if (match) {
        if (match.status === 'MENUNGGU_VERIFIKASI') {
          setVerifModalOrder(match);
        } else if (match.status === 'DIPROSES') {
          setShipModalOrder(match);
        } else {
          setDetailModalOrder(match);
        }
      }
      if (onClearSelectedOrderId) onClearSelectedOrderId();
    }
  }, [selectedOrderIdFromNotification, orders, onClearSelectedOrderId]);

  // Handle Verify Payment (Confirm / Reject)
  const handleVerifyPayment = async (action: 'CONFIRM' | 'REJECT') => {
    if (!verifModalOrder) return;
    if (action === 'REJECT' && !rejectReason.trim()) {
      alert('Mohon isi alasan penolakan bukti transfer.');
      return;
    }

    setVerifActionLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${verifModalOrder.id}/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'REJECT' ? rejectReason.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal memproses verifikasi');
      }

      setVerifModalOrder(null);
      setShowRejectInput(false);
      setRejectReason('');
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat verifikasi bukti pembayaran.');
    } finally {
      setVerifActionLoading(false);
    }
  };

  // Handle Shipping Confirmation (Input Resi & Kurir)
  const handleConfirmShipping = async () => {
    if (!shipModalOrder) return;
    if (!shipResi.trim()) {
      setShipError('Nomor resi pengiriman wajib diisi.');
      return;
    }
    if (!shipCourier.trim()) {
      setShipError('Pilihan kurir wajib diisi.');
      return;
    }

    setShipActionLoading(true);
    setShipError('');

    try {
      const res = await fetch(`/api/admin/orders/${shipModalOrder.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStatus: 'DIKIRIM',
          courierCode: shipCourier.toLowerCase(),
          trackingNumber: shipResi.trim(),
          note: `Pesanan dikirim via ${shipCourier.toUpperCase()} dengan no resi ${shipResi.trim()}`,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal memperbarui status pengiriman.');
      }

      setShipModalOrder(null);
      setShipResi('');
      fetchOrders();
    } catch (err: any) {
      setShipError(err.message || 'Terjadi kesalahan saat mengonfirmasi pengiriman.');
    } finally {
      setShipActionLoading(false);
    }
  };

  // Handle Complete Order
  const handleCompleteOrder = async (orderId: string) => {
    if (!confirm('Apakah Anda yakin ingin menandai pesanan ini sebagai SELESAI?')) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStatus: 'SELESAI',
          note: 'Pesanan telah diterima oleh pembeli / ditandai selesai oleh admin.',
        }),
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isWilayah = user?.role === 'ADMIN_WILAYAH';

  const formatRupiah = (val: number) => {
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'MENUNGGU_PEMBAYARAN':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Tunggu Bayar</span>;
      case 'MENUNGGU_VERIFIKASI':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 w-fit animate-pulse"><AlertCircle className="w-3 h-3" /> Cek Bukti Transfer</span>;
      case 'DIPROSES':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 w-fit"><Package className="w-3 h-3" /> Siap Dikirim</span>;
      case 'DIKIRIM':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit"><Truck className="w-3 h-3" /> Dikirim</span>;
      case 'SELESAI':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-stone-100 text-stone-700 border border-stone-200 flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai</span>;
      case 'DIBATALKAN':
      case 'KEDALUWARSA':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Batal</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-stone-100 text-stone-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Isolasi Wilayah */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
        isWilayah 
          ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
          : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isWilayah ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm">
              {isWilayah
                ? `Isolasi Wilayah: Menampilkan Pesanan Khusus Cabang ${user?.region?.name || 'Yogyakarta (DIY)'}`
                : 'Pusat Kendali Nasional: Menampilkan Pesanan Seluruh Wilayah'}
            </h4>
            <p className="text-[11px] opacity-80 mt-0.5">
              {isWilayah
                ? 'Sistem secara otomatis mengisolasi data operasional agar Anda fokus menangani pesanan wilayah DIY tanpa risiko tercampur dengan cabang Pusat.'
                : 'Admin Pusat dapat memantau dan mengelola verifikasi transfer serta katalog secara terpusat.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actionSummary.needsVerification > 0 && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold">
              {actionSummary.needsVerification} Butuh Verifikasi
            </span>
          )}
          {actionSummary.needsShipping > 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold">
              {actionSummary.needsShipping} Siap Dikirim
            </span>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Semua Pesanan' },
            { id: 'MENUNGGU_VERIFIKASI', label: 'Verifikasi Bukti' },
            { id: 'DIPROSES', label: 'Siap Dikirim' },
            { id: 'DIKIRIM', label: 'Sedang Dikirim' },
            { id: 'SELESAI', label: 'Selesai' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-deep-forest text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari kode / nama / WA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-deep-forest/20"
            />
          </div>
          <button
            onClick={fetchOrders}
            className="p-2 text-stone-600 hover:bg-stone-100 rounded-xl border border-stone-200 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-deep-forest" />
            <span className="text-xs font-semibold">Memuat data pesanan...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-stone-500 space-y-2">
            <Receipt className="w-10 h-10 text-stone-300 mx-auto" />
            <h4 className="text-sm font-bold text-stone-700">Tidak Ada Pesanan</h4>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Tidak ditemukan pesanan dengan kriteria filter saat ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-bold">
                <tr>
                  <th className="p-3.5">Kode Pesanan</th>
                  <th className="p-3.5">Pelanggan & Tujuan</th>
                  <th className="p-3.5">Wilayah Gudang</th>
                  <th className="p-3.5">Total & Bayar</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="p-3.5 align-top">
                      <div className="font-mono font-bold text-stone-900">{o.code}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {new Date(o.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    <td className="p-3.5 align-top max-w-[200px]">
                      <div className="font-bold text-stone-900">{o.customerName}</div>
                      <div className="text-stone-500 text-[11px] font-mono">{o.customerPhone}</div>
                      <div className="text-[11px] text-stone-500 truncate mt-0.5" title={typeof o.shippingAddress === 'object' ? `${o.shippingAddress.cityName || ''}, ${o.shippingAddress.provinceName || ''}` : o.shippingAddress}>
                        {typeof o.shippingAddress === 'object' 
                          ? `${o.shippingAddress.cityName || ''}, ${o.shippingAddress.provinceName || ''}`
                          : o.shippingAddress}
                      </div>
                    </td>

                    <td className="p-3.5 align-top">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                        {o.region?.name || 'Pusat (Depok)'}
                      </span>
                    </td>

                    <td className="p-3.5 align-top">
                      <div className="font-extrabold text-stone-900">{formatRupiah(o.totalPrice)}</div>
                      <div className="text-[10px] text-stone-500 font-semibold mt-0.5">
                        {o.paymentMethod === 'MANUAL_TRANSFER' ? 'Transfer Manual' : 'Midtrans Snap'}
                      </div>
                    </td>

                    <td className="p-3.5 align-top">
                      {getStatusBadge(o.status)}
                      {o.trackingNumber && (
                        <div className="text-[10px] font-mono font-semibold text-emerald-800 mt-1 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {o.courierCode?.toUpperCase()}: {o.trackingNumber}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Verifikasi Bukti Bayar Button */}
                        {o.status === 'MENUNGGU_VERIFIKASI' && (
                          <button
                            onClick={() => {
                              setVerifModalOrder(o);
                              setShowRejectInput(false);
                            }}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            id={`btn-verify-${o.code}`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verifikasi</span>
                          </button>
                        )}

                        {/* Kirim Pesanan (Input Resi) Button */}
                        {o.status === 'DIPROSES' && (
                          <button
                            onClick={() => {
                              setShipModalOrder(o);
                              setShipCourier(o.courierCode?.toUpperCase() || 'JNE');
                              setShipResi(o.trackingNumber || '');
                              setShipError('');
                            }}
                            className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            id={`btn-ship-${o.code}`}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Kirim Pesanan</span>
                          </button>
                        )}

                        {/* Selesaikan Pesanan Button */}
                        {o.status === 'DIKIRIM' && (
                          <button
                            onClick={() => handleCompleteOrder(o.id)}
                            className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selesai</span>
                          </button>
                        )}

                        {/* Detail Modal Trigger */}
                        <button
                          onClick={() => setDetailModalOrder(o)}
                          className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-all cursor-pointer"
                          title="Lihat Detail Pesanan"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: VERIFIKASI BUKTI BAYAR (SKENARIO 3)              */}
      {/* ========================================================= */}
      {verifModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-700" />
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Verifikasi Bukti Transfer Manual
                </h3>
              </div>
              <button
                onClick={() => setVerifModalOrder(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-xs text-purple-900 space-y-1">
                <div className="flex justify-between">
                  <span>Kode Pesanan:</span>
                  <strong className="font-mono">{verifModalOrder.code}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Nama Pemesan:</span>
                  <strong>{verifModalOrder.customerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Tagihan:</span>
                  <strong className="text-sm font-extrabold text-purple-950">
                    {formatRupiah(verifModalOrder.totalPrice)}
                  </strong>
                </div>
              </div>

              {/* Bukti Bayar Preview */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Gambar Bukti Transfer Pembeli:
                </label>
                <div className="rounded-xl border border-stone-200 overflow-hidden bg-stone-100 max-h-60 flex items-center justify-center p-2">
                  {verifModalOrder.payments?.[0]?.proofUrl ? (
                    <img
                      src={verifModalOrder.payments[0].proofUrl}
                      alt="Bukti Transfer"
                      className="max-h-56 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="p-8 text-center text-xs text-stone-500">
                      Gambar bukti transfer: (Simulasi BSI Mobile a.n. {verifModalOrder.customerName})
                    </div>
                  )}
                </div>
              </div>

              {/* Form Input Alasan Penolakan jika dipilih */}
              {showRejectInput && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="block text-xs font-bold text-red-600">
                    Alasan Penolakan Bukti (Wajib Diisi):
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Nominal transfer kurang, atau gambar bukti tidak terbaca..."
                    className="w-full p-2.5 text-xs border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    rows={2}
                  />
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2">
              {!showRejectInput ? (
                <>
                  <button
                    onClick={() => handleVerifyPayment('CONFIRM')}
                    disabled={verifActionLoading}
                    className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    id="btn-confirm-payment"
                  >
                    {verifActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Verifikasi & Terima Pembayaran</span>
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="w-full py-2.5 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Tolak Bukti Transfer Ini
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRejectInput(false)}
                    className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleVerifyPayment('REJECT')}
                    disabled={verifActionLoading}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-60"
                  >
                    {verifActionLoading ? 'Memproses...' : 'Kirim Penolakan'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: INPUT RESI & KIRIM PESANAN (SKENARIO 2)          */}
      {/* ========================================================= */}
      {shipModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Konfirmasi Pengiriman & Input Resi
                </h3>
              </div>
              <button
                onClick={() => setShipModalOrder(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {shipError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{shipError}</span>
              </div>
            )}

            <div className="space-y-3.5">
              <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <div className="flex justify-between">
                  <span>Pesanan:</span>
                  <strong className="font-mono">{shipModalOrder.code}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tujuan:</span>
                  <span className="truncate max-w-[200px]">
                    {typeof shipModalOrder.shippingAddress === 'object'
                      ? `${shipModalOrder.shippingAddress.cityName || ''}, ${shipModalOrder.shippingAddress.provinceName || ''}`
                      : shipModalOrder.shippingAddress}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Pilih Ekspedisi / Kurir Pengiriman:
                </label>
                <select
                  value={shipCourier}
                  onChange={(e) => setShipCourier(e.target.value)}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-deep-forest/20 font-bold"
                  id="ship-courier-select"
                >
                  <option value="JNE">JNE (Jalur Nugraha Ekakurir)</option>
                  <option value="SICEPAT">SiCepat Ekspres</option>
                  <option value="JNT">J&T Express</option>
                  <option value="POS">POS Indonesia</option>
                  <option value="TIKI">TIKI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nomor Resi Asli Pengiriman <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: JNE9918273645"
                  value={shipResi}
                  onChange={(e) => {
                    setShipResi(e.target.value);
                    if (shipError) setShipError('');
                  }}
                  className="w-full p-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-bold"
                  id="ship-resi-input"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Sistem mewajibkan nomor resi asli agar pembeli langsung dapat melacak paket di halaman pelacakan.
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShipModalOrder(null)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmShipping}
                disabled={shipActionLoading}
                className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                id="btn-confirm-shipping"
              >
                {shipActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                <span>Konfirmasi Pengiriman</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DETAIL PESANAN & TIMELINE                        */}
      {/* ========================================================= */}
      {detailModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm">
                  Rincian Pesanan #{detailModalOrder.code}
                </h3>
                <span className="text-[11px] text-stone-500">
                  Dibuat pada {new Date(detailModalOrder.createdAt).toLocaleString('id-ID')}
                </span>
              </div>
              <button
                onClick={() => setDetailModalOrder(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Pelanggan & Alamat */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1.5">
              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                <span>{detailModalOrder.customerName}</span>
                <span className="font-mono text-stone-500">({detailModalOrder.customerPhone})</span>
              </div>
              <p className="text-stone-600 leading-relaxed">
                {typeof detailModalOrder.shippingAddress === 'object'
                  ? `${detailModalOrder.shippingAddress.street || ''}, ${detailModalOrder.shippingAddress.district || ''}, ${detailModalOrder.shippingAddress.cityName || ''}, ${detailModalOrder.shippingAddress.provinceName || ''} ${detailModalOrder.shippingAddress.postalCode || ''}`
                  : detailModalOrder.shippingAddress}
              </p>
            </div>

            {/* Rincian Produk */}
            <div>
              <h4 className="text-xs font-bold text-stone-700 mb-2">Item Kaus Kaki:</h4>
              <div className="space-y-2">
                {detailModalOrder.items?.map((item: any) => (
                  <div key={item.id} className="p-3 bg-stone-50/70 rounded-xl border border-stone-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-stone-900">{item.productName}</div>
                      <div className="text-[11px] text-stone-500">Varian: {item.variantName} × {item.quantity} pasang</div>
                    </div>
                    <div className="font-mono font-bold text-stone-900">
                      {formatRupiah(item.subtotal || (item.priceEach * item.quantity))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Log */}
            {detailModalOrder.statusLogs && detailModalOrder.statusLogs.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-stone-700 mb-2">Riwayat Perjalanan Pesanan:</h4>
                <div className="space-y-2 border-l-2 border-deep-forest/20 pl-3 ml-2">
                  {detailModalOrder.statusLogs.map((log: any) => (
                    <div key={log.id} className="text-xs">
                      <div className="font-bold text-stone-900">{log.toStatus}</div>
                      <div className="text-stone-500 text-[11px]">{log.note || 'Status diperbarui'}</div>
                      <div className="text-[10px] text-stone-400">{new Date(log.createdAt).toLocaleString('id-ID')}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setDetailModalOrder(null)}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
