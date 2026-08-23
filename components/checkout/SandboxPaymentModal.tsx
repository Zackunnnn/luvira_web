// SandboxPaymentModal.tsx — Interactive Sandbox Payment Simulation Gateway Modal for Luvira.
// Provides realistic payment flows for QRIS and Virtual Accounts (BCA & Mandiri)
// with simulation countdown timers, clipboard copy feedback, 2.5s verification delay,
// dynamic invoice number generation (LVR-SBX-XXXX), and direct WhatsApp payload forwarding.

'use client'; // Required for modal state, timers, clipboard interaction, and animations

import React, { useState, useEffect } from 'react'; // React core & lifecycle hooks
import { CartItem, CustomerInfo } from '@/types/product'; // Types for items and customer info
import { Order } from '@/types/order'; // Order type
import { generateWhatsAppUrl, SandboxPaymentDetails } from '@/lib/whatsapp'; // WhatsApp deep link builder
import { useCartStore } from '@/store/useCartStore'; // Zustand cart store for clearing after checkout
import { useOrderStore } from '@/store/useOrderStore'; // Zustand order history store
import { DigitalReceiptModal } from './DigitalReceiptModal'; // Digital receipt component
import { BrandLogo } from '@/components/ui/BrandLogo'; // Universal official brand logo
import { useRouter } from 'next/navigation'; // Navigation hook for post-checkout redirect
import {
  X,
  QrCode,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  Building2,
  FileText,
} from 'lucide-react'; // UI icons

// Props definition for SandboxPaymentModal
export interface SandboxPaymentModalProps {
  isOpen: boolean; // Controls modal visibility
  onClose: () => void; // Handler to close the modal
  items: CartItem[]; // Cart items being checked out
  customerInfo: CustomerInfo; // Customer delivery form details
  totalPrice: number; // Order grand total in IDR
}

// Payment method types available in the sandbox simulation
type PaymentMethod = 'qris' | 'va';
type BankOption = 'bca' | 'mandiri';

export const SandboxPaymentModal: React.FC<SandboxPaymentModalProps> = ({
  isOpen,
  onClose,
  items,
  customerInfo,
  totalPrice,
}) => {
  const router = useRouter();
  const { clearCart } = useCartStore();
  const { addOrder } = useOrderStore();

  // State: Selected Payment Method ('qris' | 'va')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');

  // State: Selected Virtual Account Bank ('bca' | 'mandiri')
  const [selectedBank, setSelectedBank] = useState<BankOption>('bca');

  // State: Simulation Verification Loading State (2.5s trigger)
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationProgressText, setVerificationProgressText] = useState<string>('Menghubungi Payment Server...');

  // State: Payment Completion Success State
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // State: Generated Unique Sandbox Invoice Number (e.g., LVR-SBX-7492)
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  // State: Formatted Timestamp when payment completed
  const [paidTimestamp, setPaidTimestamp] = useState<string>('');

  // State: Completed Order Object for Digital Receipt Modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // State: Toast / Copied feedback for VA Number
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // State: QRIS Expiration Countdown Timer (seconds remaining, default 15 minutes = 900s)
  const [timerSeconds, setTimerSeconds] = useState<number>(900);

  // Simulated Virtual Account Numbers
  const vaNumbers = {
    bca: '8801 8492 0192 4810',
    mandiri: '8901 8492 0192 4810',
  };

  // Currency Formatter for Indonesian Rupiah
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format seconds into MM:SS display
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset modal states when opened
  useEffect(() => {
    if (isOpen) {
      setIsVerifying(false);
      setIsSuccess(false);
      setIsCopied(false);
      setCompletedOrder(null);
      setShowReceiptModal(false);
      setTimerSeconds(900); // Reset timer to 15:00
      setPaymentMethod('qris');
      setSelectedBank('bca');
    }
  }, [isOpen]);

  // Active countdown timer effect for QRIS simulation
  useEffect(() => {
    if (!isOpen || isSuccess || timerSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isSuccess, timerSeconds]);

  // Handler: Copy VA Number to clipboard with feedback
  const handleCopyVA = async () => {
    const rawNumber = vaNumbers[selectedBank].replace(/\s+/g, '');
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(rawNumber);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Handler: Trigger 2.5s Payment Verification Simulation
  const handleSimulatePayment = () => {
    setIsVerifying(true);
    setVerificationProgressText('Menghubungi Sandbox Gateway...');

    // Dynamic progress message stages during the 2.5s simulation
    setTimeout(() => {
      setVerificationProgressText('Memverifikasi Transaksi Sandbox...');
    }, 900);

    setTimeout(() => {
      setVerificationProgressText('Menyelesaikan Otentikasi Pembayaran...');
    }, 1800);

    // After 2.5 seconds (2500ms), transition to Success state
    setTimeout(() => {
      // Generate randomized 4-character alphanumeric suffix for invoice
      const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      const generatedInvoice = `LVR-SBX-${randomSuffix}`;

      // Current timestamp formatted in Indonesian locale
      const now = new Date();
      const formattedDate =
        new Intl.DateTimeFormat('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Jakarta',
        }).format(now) + ' WIB';

      const methodName =
        paymentMethod === 'qris'
          ? 'QRIS Luvira Instant'
          : selectedBank === 'bca'
          ? 'BCA Virtual Account (Sandbox)'
          : 'Mandiri Virtual Account (Sandbox)';

      // Construct verified Order object
      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        invoiceNumber: generatedInvoice,
        customerInfo,
        items,
        totalPrice,
        paymentMethod: methodName,
        status: 'Sandbox Verified',
        createdAt: formattedDate,
      };

      // Automatically log order into persistent useOrderStore (Zero-Cost LocalStorage)
      addOrder(newOrder);
      setCompletedOrder(newOrder);

      setInvoiceNumber(generatedInvoice);
      setPaidTimestamp(formattedDate);
      setIsVerifying(false);
      setIsSuccess(true);
    }, 2500);
  };

  // Handler: Finalize order and redirect to WhatsApp with Verified Status
  const handleSendToWhatsApp = () => {
    const methodName =
      paymentMethod === 'qris'
        ? 'QRIS Luvira Instant'
        : selectedBank === 'bca'
        ? 'BCA Virtual Account (Sandbox)'
        : 'Mandiri Virtual Account (Sandbox)';

    const paymentDetails: SandboxPaymentDetails = {
      invoiceNumber,
      method: methodName,
      paidAt: paidTimestamp,
    };

    // Generate WhatsApp deep link containing verified sandbox invoice
    const waUrl = generateWhatsAppUrl(items, customerInfo, undefined, paymentDetails);

    // Open WhatsApp in new browser tab
    window.open(waUrl, '_blank');

    // Clean up cart store and navigate smoothly to homepage
    clearCart();
    onClose();
    router.push('/');
  };

  // If modal is not active, render nothing
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Modal Container Card */}
      <div className="relative w-full max-w-lg bg-warm-cream rounded-3xl shadow-2xl border border-deep-forest/15 overflow-hidden flex flex-col my-auto transition-all">
        
        {/* ========== MODAL HEADER ========== */}
        <div className="bg-deep-forest text-warm-cream px-6 py-4 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            {/* Official Brand Logo */}
            <BrandLogo size="sm" theme="dark" asLink={false} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold tracking-wide text-white">
                  Payment Simulation
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-leaf-olive text-white tracking-wider uppercase">
                  Sandbox
                </span>
              </div>
              <p className="text-[10px] text-warm-cream/75">
                Simulasi pembayaran resmi Luvira
              </p>
            </div>
          </div>

          {/* Close button (disabled during active verification loading) */}
          <button
            type="button"
            onClick={onClose}
            disabled={isVerifying}
            className="p-1.5 rounded-full hover:bg-white/10 text-warm-cream/80 hover:text-white transition-all disabled:opacity-30 cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========== MODAL BODY ========== */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* ================= STATE 1: SELECTION & SIMULATION VIEW ================= */}
          {!isSuccess && !isVerifying && (
            <>
              {/* Grand Total Highlight Banner */}
              <div className="p-4 rounded-2xl bg-white border border-deep-forest/10 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-muted-charcoal/60 uppercase tracking-wider block">
                    Total Tagihan Checkout
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-deep-forest">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-muted-charcoal/60 block">
                    Pemesan
                  </span>
                  <span className="text-xs font-bold text-muted-charcoal truncate max-w-[120px] sm:max-w-[160px] block">
                    {customerInfo.name || 'Pelanggan Luvira'}
                  </span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-charcoal flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-leaf-olive" />
                  <span>Pilih Metode Pembayaran Simulasi:</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: QRIS Luvira Instant */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 ${
                      paymentMethod === 'qris'
                        ? 'bg-white border-deep-forest shadow-md ring-2 ring-deep-forest/20'
                        : 'bg-white/60 hover:bg-white border-gray-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-deep-forest/10 text-deep-forest">
                        <QrCode className="w-5 h-5" />
                      </div>
                      {paymentMethod === 'qris' && (
                        <CheckCircle2 className="w-4 h-4 text-leaf-olive" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-muted-charcoal">
                        QRIS Instant
                      </div>
                      <div className="text-[10px] text-muted-charcoal/60 mt-0.5">
                        BCA, GoPay, OVO, Dana
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Virtual Account (Sandbox) */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('va')}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 ${
                      paymentMethod === 'va'
                        ? 'bg-white border-deep-forest shadow-md ring-2 ring-deep-forest/20'
                        : 'bg-white/60 hover:bg-white border-gray-200 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-leaf-olive/15 text-leaf-olive">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      {paymentMethod === 'va' && (
                        <CheckCircle2 className="w-4 h-4 text-leaf-olive" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-muted-charcoal">
                        Virtual Account
                      </div>
                      <div className="text-[10px] text-muted-charcoal/60 mt-0.5">
                        BCA & Mandiri Sandbox
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* ========== SUB-VIEW: QRIS LUVIRA INSTANT ========== */}
              {paymentMethod === 'qris' && (
                <div className="p-5 bg-white rounded-2xl border border-deep-forest/10 shadow-xs space-y-4 text-center animate-in fade-in zoom-in-95 duration-200">
                  {/* Countdown Timer Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-dusty-rose/15 text-dusty-rose text-xs font-bold border border-dusty-rose/30">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>Selesaikan dalam {formatTimer(timerSeconds)}</span>
                  </div>

                  {/* Aesthetic QR Mockup Container */}
                  <div className="relative mx-auto w-52 h-52 p-3 bg-white rounded-2xl border-2 border-dashed border-deep-forest/30 flex flex-col items-center justify-center shadow-inner">
                    {/* Simulated SVG QR Code with Luxury Luvira Centerpiece */}
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full text-deep-forest"
                      fill="currentColor"
                    >
                      {/* Top-Left Finder */}
                      <rect x="5" y="5" width="26" height="26" rx="4" fill="#1E4D48" />
                      <rect x="9" y="9" width="18" height="18" rx="2" fill="#FFFFFF" />
                      <rect x="13" y="13" width="10" height="10" rx="2" fill="#1E4D48" />

                      {/* Top-Right Finder */}
                      <rect x="69" y="5" width="26" height="26" rx="4" fill="#1E4D48" />
                      <rect x="73" y="9" width="18" height="18" rx="2" fill="#FFFFFF" />
                      <rect x="77" y="13" width="10" height="10" rx="2" fill="#1E4D48" />

                      {/* Bottom-Left Finder */}
                      <rect x="5" y="69" width="26" height="26" rx="4" fill="#1E4D48" />
                      <rect x="9" y="73" width="18" height="18" rx="2" fill="#FFFFFF" />
                      <rect x="13" y="77" width="10" height="10" rx="2" fill="#1E4D48" />

                      {/* Decorative Matrix Patterns */}
                      <rect x="36" y="8" width="6" height="6" rx="1.5" />
                      <rect x="46" y="8" width="6" height="6" rx="1.5" />
                      <rect x="56" y="8" width="6" height="6" rx="1.5" />
                      <rect x="36" y="18" width="6" height="6" rx="1.5" />
                      <rect x="56" y="18" width="6" height="6" rx="1.5" />
                      <rect x="36" y="28" width="6" height="6" rx="1.5" />
                      <rect x="46" y="28" width="6" height="6" rx="1.5" />
                      <rect x="8" y="36" width="6" height="6" rx="1.5" />
                      <rect x="18" y="36" width="6" height="6" rx="1.5" />
                      <rect x="68" y="36" width="6" height="6" rx="1.5" />
                      <rect x="78" y="36" width="6" height="6" rx="1.5" />
                      <rect x="88" y="36" width="6" height="6" rx="1.5" />
                      <rect x="68" y="46" width="6" height="6" rx="1.5" />
                      <rect x="88" y="46" width="6" height="6" rx="1.5" />
                      <rect x="36" y="68" width="6" height="6" rx="1.5" />
                      <rect x="56" y="68" width="6" height="6" rx="1.5" />
                      <rect x="46" y="78" width="6" height="6" rx="1.5" />
                      <rect x="78" y="78" width="6" height="6" rx="1.5" />
                      <rect x="68" y="88" width="6" height="6" rx="1.5" />
                      <rect x="88" y="88" width="6" height="6" rx="1.5" />
                      <rect x="8" y="56" width="6" height="6" rx="1.5" />
                      <rect x="18" y="56" width="6" height="6" rx="1.5" />
                    </svg>

                    {/* Brand Center Badge in QR Code */}
                    <div className="absolute inset-0 m-auto w-12 h-12 bg-white rounded-xl shadow-md border border-deep-forest/20 flex flex-col items-center justify-center text-center p-0.5">
                      <span className="text-[9px] font-black tracking-tighter text-deep-forest leading-none">
                        LUVIRA
                      </span>
                      <span className="text-[7px] text-leaf-olive font-bold leading-none mt-0.5">
                        QRIS
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-charcoal/70 leading-relaxed max-w-xs mx-auto">
                    NMID: <strong className="text-deep-forest font-mono">ID1029384756192</strong>
                    <br />
                    Mendukung semua e-wallet & m-banking berstandar QRIS Indonesia.
                  </p>
                </div>
              )}

              {/* ========== SUB-VIEW: VIRTUAL ACCOUNT ========== */}
              {paymentMethod === 'va' && (
                <div className="p-5 bg-white rounded-2xl border border-deep-forest/10 shadow-xs space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  {/* Bank Switcher Tabs */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBank('bca')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        selectedBank === 'bca'
                          ? 'bg-deep-forest text-white border-deep-forest shadow-xs'
                          : 'bg-warm-cream text-muted-charcoal/80 border-gray-200 hover:bg-white'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>BCA Virtual Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBank('mandiri')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        selectedBank === 'mandiri'
                          ? 'bg-deep-forest text-white border-deep-forest shadow-xs'
                          : 'bg-warm-cream text-muted-charcoal/80 border-gray-200 hover:bg-white'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Mandiri VA</span>
                    </button>
                  </div>

                  {/* Virtual Account Number Copy Card */}
                  <div className="p-4 rounded-xl bg-warm-cream border border-deep-forest/15 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-charcoal/70">
                      <span>Nomor Virtual Account ({selectedBank.toUpperCase()})</span>
                      <span className="font-semibold text-leaf-olive">Sandbox Mode</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-base sm:text-lg font-extrabold text-deep-forest tracking-wider select-all">
                        {vaNumbers[selectedBank]}
                      </span>

                      {/* Interactive Copy Button with Toast Feedback */}
                      <button
                        type="button"
                        onClick={handleCopyVA}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                          isCopied
                            ? 'bg-leaf-olive text-white'
                            : 'bg-deep-forest text-white hover:bg-deep-forest/90'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin VA</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isCopied && (
                      <p className="text-[11px] font-semibold text-leaf-olive animate-in fade-in slide-in-from-top-1">
                        ✓ Nomor Virtual Account berhasil disalin ke clipboard!
                      </p>
                    )}
                  </div>

                  {/* Quick Payment Instructions */}
                  <div className="text-[11px] text-muted-charcoal/70 space-y-1 bg-white p-3 rounded-xl border border-gray-100">
                    <p className="font-bold text-muted-charcoal">Petunjuk Simulasi:</p>
                    <p>1. Salin nomor VA di atas.</p>
                    <p>2. Tekan tombol simulasi bayar di bawah untuk verifikasi instan.</p>
                  </div>
                </div>
              )}

              {/* Action Button: Trigger Simulation */}
              <button
                type="button"
                onClick={handleSimulatePayment}
                className="w-full py-4 px-6 rounded-2xl bg-deep-forest hover:bg-deep-forest/95 text-warm-cream text-sm font-extrabold shadow-lg shadow-deep-forest/25 hover:shadow-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Simulasi Bayar Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* ================= STATE 2: VERIFICATION LOADING (2.5 SECONDS) ================= */}
          {isVerifying && (
            <div className="py-12 px-4 text-center space-y-6 animate-in fade-in duration-300">
              {/* Pulsing Loading Spinner with Brand Accents */}
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-leaf-olive/20 border-t-deep-forest animate-spin" />
                <div className="w-12 h-12 rounded-full bg-deep-forest/10 flex items-center justify-center text-deep-forest">
                  <RefreshCw className="w-6 h-6 animate-spin text-deep-forest" />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-base font-bold text-deep-forest">
                  Memproses Pembayaran Simulasi...
                </h4>
                <p className="text-xs text-muted-charcoal/70 font-medium animate-pulse">
                  {verificationProgressText}
                </p>
              </div>

              <div className="p-3 bg-white rounded-xl border border-deep-forest/10 max-w-xs mx-auto text-[11px] text-muted-charcoal/60">
                🔒 Simulasi aman berjalan di local sandbox Luvira.
              </div>
            </div>
          )}

          {/* ================= STATE 3: SUCCESS & INVOICE RECEIPT ================= */}
          {isSuccess && (
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
              
              {/* Success Badge & Animated Checkmark */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-leaf-olive/15 text-leaf-olive border-2 border-leaf-olive/30 flex items-center justify-center mx-auto shadow-sm animate-in zoom-in duration-300">
                  <CheckCircle2 className="w-9 h-9 text-leaf-olive" />
                </div>
                <h4 className="text-lg font-extrabold text-deep-forest">
                  Pembayaran Simulasi Berhasil!
                </h4>
                <p className="text-xs text-muted-charcoal/70">
                  Transaksi sandbox Anda telah terverifikasi secara instan.
                </p>
              </div>

              {/* Receipt / Invoice Details Card */}
              <div className="p-4 bg-white rounded-2xl border border-deep-forest/15 shadow-xs space-y-3 text-xs">
                
                {/* Invoice Number Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <span className="text-muted-charcoal/60 font-medium">No. Invoice Sandbox</span>
                  <span className="font-mono font-extrabold text-deep-forest px-2.5 py-0.5 rounded-lg bg-deep-forest/5 border border-deep-forest/15">
                    {invoiceNumber}
                  </span>
                </div>

                {/* Method */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-charcoal/60">Metode Pembayaran</span>
                  <span className="font-bold text-muted-charcoal">
                    {paymentMethod === 'qris'
                      ? 'QRIS Luvira Instant'
                      : `${selectedBank.toUpperCase()} Virtual Account`}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-charcoal/60">Status Pembayaran</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-leaf-olive bg-leaf-olive/15 px-2 py-0.5 rounded-md border border-leaf-olive/20">
                    <Check className="w-3 h-3" /> Lunas Terverifikasi
                  </span>
                </div>

                {/* Timestamp */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-charcoal/60">Waktu Transaksi</span>
                  <span className="font-medium text-muted-charcoal/80">
                    {paidTimestamp}
                  </span>
                </div>

                {/* Grand Total */}
                <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 text-sm">
                  <span className="font-bold text-muted-charcoal">Total Terbayar</span>
                  <span className="font-extrabold text-deep-forest text-base">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Actions: View Digital Receipt & Send to WhatsApp */}
              <div className="space-y-2.5 pt-1">
                {/* Secondary Button: View/Download Digital Receipt */}
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-warm-cream text-deep-forest text-xs sm:text-sm font-extrabold border-2 border-deep-forest/20 shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-leaf-olive" />
                  <span>Lihat & Cetak Struk Digital (Invoice PDF)</span>
                </button>

                {/* Primary Button: WhatsApp Submission CTA */}
                <button
                  type="button"
                  onClick={handleSendToWhatsApp}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-extrabold shadow-lg shadow-emerald-700/25 hover:shadow-xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <MessageSquare className="w-5 h-5 fill-white text-emerald-700" />
                  <span>Kirim Bukti & Validasi Pesanan ke WhatsApp</span>
                </button>

                <p className="text-[11px] text-center text-muted-charcoal/60">
                  Data pemesan & nomor invoice sandbox otomatis tersimpan di riwayat admin & siap diteruskan ke WhatsApp.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* ========== MODAL FOOTER ========== */}
        <div className="bg-deep-forest/5 px-6 py-3 border-t border-deep-forest/10 text-center">
          <p className="text-[10px] text-muted-charcoal/60 font-medium">
            🔒 Luvira Sandbox Payment Simulator • Tidak memotong saldo riil
          </p>
        </div>

      </div>

      {/* Embedded Digital Receipt Modal */}
      <DigitalReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        order={completedOrder}
      />
    </div>
  );
};
