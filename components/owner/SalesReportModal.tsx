'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Filter, 
  Calendar, 
  Building2, 
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';

interface SalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[];
}

export default function SalesReportModal({
  isOpen,
  onClose,
  transactions = [],
}: SalesReportModalProps) {
  // Filters
  const [periodFilter, setPeriodFilter] = useState<'today' | '7days' | 'this_month' | 'all'>('all');
  const [outletFilter, setOutletFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Format currency helper
  const formatRp = (val: number) => {
    return `Rp ${(val || 0).toLocaleString('id-ID')}`;
  };

  // Format date helper: DD/MM/YYYY
  const formatDateDMY = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Filter transactions
  const filteredRows = useMemo(() => {
    const now = new Date();

    return transactions.flatMap((tx) => {
      const txDate = new Date(tx.createdAt);

      // Period filter
      if (periodFilter === 'today') {
        const isToday =
          txDate.getDate() === now.getDate() &&
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear();
        if (!isToday) return [];
      } else if (periodFilter === '7days') {
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return [];
      } else if (periodFilter === 'this_month') {
        const isThisMonth =
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear();
        if (!isThisMonth) return [];
      }

      // Outlet filter
      const regionName = tx.region?.name || 'Pusat (Depok)';
      if (outletFilter !== 'ALL' && !regionName.toLowerCase().includes(outletFilter.toLowerCase())) {
        return [];
      }

      // Payment filter
      const isMidtrans = tx.paymentMethod === 'MIDTRANS_SNAP' || tx.paymentMethod === 'midtrans';
      if (paymentFilter === 'midtrans' && !isMidtrans) return [];
      if (paymentFilter === 'manual' && isMidtrans) return [];

      // Determine payment label
      const paymentLabel = isMidtrans ? 'QRIS / Midtrans' : 'Transfer Bank';

      // Expand items per order
      if (Array.isArray(tx.items) && tx.items.length > 0) {
        return tx.items.map((item: any, idx: number) => {
          // If order has promo discount, proportionally or display on first item
          const itemDiscount = idx === 0 && tx.discountAmount ? tx.discountAmount : 0;
          const itemTotal = (item.priceEach * item.quantity) - itemDiscount;

          return {
            date: txDate,
            dateFormatted: formatDateDMY(txDate),
            invoice: tx.code || `INV/${tx.id.slice(0, 8)}`,
            productName: `${item.productName || 'Produk'} (${item.variantName || 'Varian'})`,
            qty: item.quantity || 1,
            unitPrice: item.priceEach || 0,
            discount: itemDiscount,
            total: itemTotal > 0 ? itemTotal : 0,
            paymentMethod: paymentLabel,
            regionName,
          };
        });
      }

      // Fallback single line if no items array
      return [
        {
          date: txDate,
          dateFormatted: formatDateDMY(txDate),
          invoice: tx.code || `INV/${tx.id.slice(0, 8)}`,
          productName: 'Koleksi Kaus Kaki Luvira',
          qty: 1,
          unitPrice: tx.subtotal || tx.totalPrice,
          discount: tx.discountAmount || 0,
          total: tx.totalPrice,
          paymentMethod: paymentLabel,
          regionName,
        },
      ];
    });
  }, [transactions, periodFilter, outletFilter, paymentFilter]);

  // Totals
  const totalQty = useMemo(() => filteredRows.reduce((acc, r) => acc + r.qty, 0), [filteredRows]);
  const totalDiscount = useMemo(() => filteredRows.reduce((acc, r) => acc + r.discount, 0), [filteredRows]);
  const totalSales = useMemo(() => filteredRows.reduce((acc, r) => acc + r.total, 0), [filteredRows]);

  // Label Tanggal / Periode
  const periodLabelText = useMemo(() => {
    const todayStr = formatDateDMY(new Date());
    if (periodFilter === 'today') return todayStr;
    if (periodFilter === '7days') return `7 Hari Terakhir (s/d ${todayStr})`;
    if (periodFilter === 'this_month') {
      const now = new Date();
      return `${now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}`;
    }
    return `Semua Periode (s/d ${todayStr})`;
  }, [periodFilter]);

  // Label Outlet
  const outletLabelText = useMemo(() => {
    if (outletFilter === 'ALL') return 'Semua';
    if (outletFilter === 'yogyakarta') return 'Cabang Yogyakarta (DIY)';
    if (outletFilter === 'pusat') return 'Pusat (Depok)';
    return outletFilter;
  }, [outletFilter]);

  // Handler Print
  const handlePrint = () => {
    window.print();
  };

  // Handler Export CSV
  const handleExportCsv = () => {
    const headers = ['No', 'Tanggal', 'No. Invoice', 'Produk', 'Qty', 'Harga Satuan', 'Diskon', 'Total', 'Metode Bayar'];
    const rows = filteredRows.map((r, i) => [
      i + 1,
      r.dateFormatted,
      `"${r.invoice}"`,
      `"${r.productName}"`,
      r.qty,
      r.unitPrice,
      r.discount,
      r.total,
      `"${r.paymentMethod}"`,
    ]);

    // Footer row
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      totalQty,
      '',
      totalDiscount,
      totalSales,
      '',
    ]);

    const csvContent = [
      `LAPORAN PENJUALAN HARIAN / PERIODIK`,
      `Tanggal: ${periodLabelText}`,
      `Toko/Outlet: ${outletLabelText}`,
      ``,
      headers.join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_penjualan_luvira_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      {/* Styles for printing only the report document */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #sales-report-printable,
          #sales-report-printable * {
            visibility: visible;
          }
          #sales-report-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          @page {
            size: landscape;
            margin: 8mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* MODAL HEADER WITH CONTROLS */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#800000] text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-900">
                Preview Laporan Penjualan
              </h3>
              <p className="text-xs text-stone-500">
                Pratinjau laporan bergaya resmi sebelum dicetak atau diunduh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              title="Cetak atau Simpan sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#800000] hover:bg-[#660000] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              title="Unduh file Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* FILTER BAR INSIDE MODAL */}
        <div className="px-5 py-3 border-b border-stone-100 bg-white flex items-center gap-3 flex-wrap text-xs">
          {/* Periode */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-semibold text-stone-600">Periode:</span>
            <select
              value={periodFilter}
              onChange={(e: any) => setPeriodFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#800000]"
            >
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="this_month">Bulan Ini</option>
              <option value="all">Semua Waktu</option>
            </select>
          </div>

          {/* Toko / Outlet */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-semibold text-stone-600">Toko/Outlet:</span>
            <select
              value={outletFilter}
              onChange={(e) => setOutletFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#800000]"
            >
              <option value="ALL">Semua Toko</option>
              <option value="pusat">Pusat (Depok)</option>
              <option value="yogyakarta">Cabang Yogyakarta (DIY)</option>
            </select>
          </div>

          {/* Metode Pembayaran */}
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-stone-500" />
            <span className="font-semibold text-stone-600">Metode Bayar:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#800000]"
            >
              <option value="ALL">Semua Metode</option>
              <option value="midtrans">QRIS & Midtrans</option>
              <option value="manual">Transfer Bank Manual</option>
            </select>
          </div>

          <div className="ml-auto text-stone-400 font-medium">
            Total {filteredRows.length} baris transaksi
          </div>
        </div>

        {/* MODAL BODY: THE PRINTABLE SHEET CANVAS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-stone-100/70 flex justify-center">
          <div
            id="sales-report-printable"
            className="bg-white rounded-2xl shadow-md border border-stone-200/80 p-6 sm:p-10 w-full max-w-4xl text-stone-900 font-sans"
          >
            {/* DOCUMENT TITLE (EXACT STYLE FROM SCREENSHOT) */}
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 uppercase">
                LAPORAN PENJUALAN HARIAN
              </h1>

              {/* METADATA ROWS */}
              <div className="mt-3 space-y-1 text-xs sm:text-sm text-stone-700">
                <div className="flex">
                  <span className="w-28 font-medium">Tanggal</span>
                  <span className="mr-2">:</span>
                  <span className="font-semibold">{periodLabelText}</span>
                </div>
                <div className="flex">
                  <span className="w-28 font-medium">Toko/Outlet</span>
                  <span className="mr-2">:</span>
                  <span className="font-semibold">{outletLabelText}</span>
                </div>
              </div>
            </div>

            {/* REPORT TABLE (EXACT MAROON HEADER & BORDERS) */}
            <div className="overflow-x-auto border border-stone-300 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#800000] text-white">
                    <th className="py-2.5 px-3 font-bold text-center border-r border-[#990000] w-10">No</th>
                    <th className="py-2.5 px-3 font-bold text-center border-r border-[#990000] w-24">Tanggal</th>
                    <th className="py-2.5 px-3 font-bold text-center border-r border-[#990000] w-32">No. Invoice</th>
                    <th className="py-2.5 px-3 font-bold border-r border-[#990000]">Produk</th>
                    <th className="py-2.5 px-3 font-bold text-center border-r border-[#990000] w-12">Qty</th>
                    <th className="py-2.5 px-3 font-bold text-right border-r border-[#990000] w-28">Harga Satuan</th>
                    <th className="py-2.5 px-3 font-bold text-right border-r border-[#990000] w-24">Diskon</th>
                    <th className="py-2.5 px-3 font-bold text-right border-r border-[#990000] w-28">Total</th>
                    <th className="py-2.5 px-3 font-bold text-center w-28">Metode Bayar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-stone-400 italic">
                        Tidak ada transaksi pada filter periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 1 ? 'bg-stone-50/60' : 'bg-white'}
                      >
                        <td className="py-2 px-3 text-center border-r border-stone-200 text-stone-600 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-stone-200 font-mono text-[11px]">
                          {row.dateFormatted}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-stone-200 font-mono font-bold text-stone-800 text-[11px]">
                          {row.invoice}
                        </td>
                        <td className="py-2 px-3 border-r border-stone-200 font-medium text-stone-800">
                          {row.productName}
                        </td>
                        <td className="py-2 px-3 text-center border-r border-stone-200 font-bold">
                          {row.qty}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-stone-200 font-mono">
                          {formatRp(row.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-stone-200 font-mono text-stone-600">
                          {formatRp(row.discount)}
                        </td>
                        <td className="py-2 px-3 text-right border-r border-stone-200 font-mono font-bold text-stone-900">
                          {formatRp(row.total)}
                        </td>
                        <td className="py-2 px-3 text-center text-stone-700 font-medium text-[11px]">
                          {row.paymentMethod}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FFF5F5] font-black border-t-2 border-stone-300 text-stone-900">
                    <td colSpan={4} className="py-2.5 px-3 text-center border-r border-stone-300 uppercase tracking-wider text-xs">
                      TOTAL
                    </td>
                    <td className="py-2.5 px-3 text-center border-r border-stone-300 text-sm font-black">
                      {totalQty}
                    </td>
                    <td className="py-2.5 px-3 border-r border-stone-300"></td>
                    <td className="py-2.5 px-3 text-right border-r border-stone-300 font-mono text-stone-800">
                      {formatRp(totalDiscount)}
                    </td>
                    <td className="py-2.5 px-3 text-right border-r border-stone-300 font-mono font-black text-sm text-[#800000]">
                      {formatRp(totalSales)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* FOOTER SIGNATURE & TIMESTAMP */}
            <div className="mt-8 pt-4 border-t border-dashed border-stone-300 flex justify-between items-center text-[11px] text-stone-500">
              <span>Dicetak otomatis dari Sistem Luvira 2.0 • Hak Akses Owner</span>
              <span>Waktu Cetak: {new Date().toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
