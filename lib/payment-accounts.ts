// lib/payment-accounts.ts
// ============================================================================
// Rekening Transfer Manual Luvira (Konstanta Sementara sebelum Luvira 2.0)
// Di Luvira 2.0, data ini akan dipindahkan ke tabel database `PaymentAccount`.
// ============================================================================

export interface PaymentAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export const MANUAL_PAYMENT_ACCOUNTS: PaymentAccount[] = [
  {
    id: 'jago-syariah',
    bankName: 'Jago Syariah',
    accountNumber: '509366156008',
    accountHolder: 'Muhammad Naufal Ammr Dzakwan',
  },
  {
    id: 'bsi',
    bankName: 'BSI (Bank Syariah Indonesia)',
    accountNumber: '7239477938',
    accountHolder: 'Muhammad Naufal Ammr Dzakwan',
  },
];
