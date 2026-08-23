// DigitalReceiptModal.tsx — Aesthetic Digital Receipt & Invoice Card for Luvira.
// Renders an elegant luxury invoice card with order details, QR verification badge,
// print-media styling for PDF/Receipt export, and WhatsApp validation actions.

'use client';

import React, { useRef } from 'react';
import { Order } from '@/types/order';
import { Button } from '@/components/ui/Button';
import { BrandLogo } from '@/components/ui/BrandLogo';
import {
  X,
  Printer,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  Phone,
  MapPin,
  QrCode,
  Download,
  Share2,
} from 'lucide-react';

interface DigitalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  // Currency Formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handler for printing / exporting receipt to PDF
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Main Container */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-deep-forest/15 overflow-hidden z-10 my-auto flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-deep-forest text-warm-cream flex items-center justify-between sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-dusty-rose" />
            <span className="text-xs font-black tracking-wider uppercase">
              Bukti Transaksi Resmi Luvira
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-warm-cream/80 hover:text-white transition-all cursor-pointer"
            aria-label="Tutup Struk"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8F6F0]">
          
          {/* ========== AESTHETIC RECEIPT CARD (Target for Print/View) ========== */}
          <div
            ref={receiptRef}
            id="digital-receipt-card"
            className="bg-warm-cream p-6 sm:p-7 rounded-3xl border-2 border-deep-forest/20 shadow-md space-y-5 text-muted-charcoal relative overflow-hidden"
          >
            {/* Top Decorative Border Pattern */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-deep-forest via-leaf-olive to-dusty-rose" />

            {/* Receipt Brand Header */}
            <div className="text-center space-y-2 border-b border-deep-forest/10 pb-4 pt-1">
              <div className="flex items-center justify-center">
                <BrandLogo size="md" theme="light" asLink={false} />
              </div>
              <div className="pt-0.5">
                <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-deep-forest text-warm-cream">
                  Official Digital Receipt
                </span>
              </div>
            </div>

            {/* Invoice & Status Badge Banner */}
            <div className="bg-white p-3.5 rounded-2xl border border-deep-forest/10 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[10px] text-muted-charcoal/60 uppercase font-semibold block">
                  Nomor Invoice
                </span>
                <span className="font-mono text-sm sm:text-base font-black text-deep-forest">
                  {order.invoiceNumber}
                </span>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-leaf-olive/15 text-leaf-olive border border-leaf-olive/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{order.status.toUpperCase()}</span>
                </span>
              </div>
            </div>

            {/* Meta Details: Date, Payment, Customer */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-charcoal/60 uppercase font-semibold flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-leaf-olive" /> Waktu Transaksi
                </span>
                <p className="font-bold text-muted-charcoal">{order.createdAt}</p>
              </div>

              <div className="space-y-0.5 text-right">
                <span className="text-[10px] text-muted-charcoal/60 uppercase font-semibold flex items-center justify-end gap-1">
                  <Building2 className="w-3 h-3 text-leaf-olive" /> Metode Bayar
                </span>
                <p className="font-bold text-deep-forest">{order.paymentMethod}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-charcoal/60 uppercase font-semibold flex items-center gap-1">
                  <User className="w-3 h-3 text-leaf-olive" /> Nama Pemesan
                </span>
                <p className="font-bold text-muted-charcoal">{order.customerInfo.name}</p>
              </div>

              <div className="space-y-0.5 text-right">
                <span className="text-[10px] text-muted-charcoal/60 uppercase font-semibold flex items-center justify-end gap-1">
                  <Phone className="w-3 h-3 text-leaf-olive" /> No. WhatsApp
                </span>
                <p className="font-bold font-mono text-muted-charcoal">{order.customerInfo.phone}</p>
              </div>

              {order.customerInfo.address && (
                <div className="col-span-2 space-y-0.5 border-t border-deep-forest/5 pt-2">
                  <span className="text-[10px] text-muted-charcoal/60 uppercase font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-leaf-olive" /> Alamat Pengiriman
                  </span>
                  <p className="text-xs text-muted-charcoal/80 leading-relaxed">
                    {order.customerInfo.address}
                  </p>
                </div>
              )}
            </div>

            {/* Itemized Order Details Table */}
            <div className="space-y-2 border-t border-b border-deep-forest/10 py-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-deep-forest block">
                Rincian Kaus Kaki Dipesan:
              </span>

              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div
                    key={`${item.product.id}-${item.selectedVariant.id}-${idx}`}
                    className="bg-white p-2.5 rounded-xl border border-deep-forest/5 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-muted-charcoal truncate">
                        {item.product.name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10 inline-block"
                          style={{ backgroundColor: item.selectedVariant.hex }}
                        />
                        <span className="text-[11px] text-muted-charcoal/70">
                          {item.selectedVariant.name}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-deep-forest/10 text-deep-forest">
                          {item.quantity}x
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-deep-forest">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                      <span className="text-[10px] text-muted-charcoal/50 block">
                        @{formatCurrency(item.product.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Price Calculation */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-charcoal/70">
                <span>Subtotal Barang</span>
                <span className="font-semibold">{formatCurrency(order.totalPrice)}</span>
              </div>
              <div className="flex justify-between text-muted-charcoal/70">
                <span>Biaya Ongkos Kirim</span>
                <span className="text-leaf-olive font-semibold">Subsidi Otomatis (Rp 0)</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base font-black text-deep-forest pt-2 border-t border-deep-forest/10">
                <span>Total Lunas</span>
                <span>{formatCurrency(order.totalPrice)}</span>
              </div>
            </div>

            {/* Verification Watermark & QR Code Mockup */}
            <div className="bg-white p-3 rounded-2xl border border-deep-forest/10 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-deep-forest flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-dusty-rose" /> Dokumen Sah Transaksi Luvira
                </span>
                <p className="text-[10px] text-muted-charcoal/60 leading-tight">
                  Tersimpan di Luvira Sandbox Ledger. Simpan struk ini sebagai bukti pembelian sah.
                </p>
              </div>

              {/* Mini QR Code Visual */}
              <div className="w-12 h-12 bg-warm-cream rounded-xl border border-deep-forest/20 p-1 flex items-center justify-center shrink-0">
                <QrCode className="w-9 h-9 text-deep-forest" />
              </div>
            </div>

          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-white border-t border-deep-forest/10 flex flex-col sm:flex-row items-center gap-3 sticky bottom-0 z-20 print:hidden">
          <Button
            onClick={handlePrintReceipt}
            variant="primary"
            size="md"
            className="flex-1 font-bold text-xs sm:text-sm py-3 cursor-pointer shadow-sm w-full"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / Unduh Struk (PDF)</span>
          </Button>

          <button
            onClick={onClose}
            className="px-4 py-3 text-xs sm:text-sm font-bold text-muted-charcoal/80 bg-muted-charcoal/5 hover:bg-muted-charcoal/10 rounded-2xl transition-all cursor-pointer w-full sm:w-auto"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* Print-specific style tag for isolating receipt during window.print() */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #digital-receipt-card,
          #digital-receipt-card * {
            visibility: visible;
          }
          #digital-receipt-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: 1px solid #1e4d48 !important;
          }
        }
      `}</style>
    </div>
  );
};
