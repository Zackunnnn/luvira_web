'use client';

import React, { useState } from 'react';
import { MANUAL_PAYMENT_ACCOUNTS, PaymentAccount } from '@/lib/payment-accounts';
import { Copy, Check, Building2 } from 'lucide-react';

export default function BankAccountSelector() {
  const [selectedId, setSelectedId] = useState<string>(MANUAL_PAYMENT_ACCOUNTS[0]?.id || '');
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const handleCopy = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedNumber(accountNumber);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  return (
    <div className="space-y-2.5 pt-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-charcoal/70 mb-1">
        <Building2 className="w-3.5 h-3.5 text-leaf-olive" />
        <span>Pilih Rekening Tujuan Transfer:</span>
      </div>

      <div className="space-y-2">
        {MANUAL_PAYMENT_ACCOUNTS.map((account: PaymentAccount) => {
          const isSelected = selectedId === account.id;
          const isCopied = copiedNumber === account.accountNumber;

          return (
            <div
              key={account.id}
              onClick={() => setSelectedId(account.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-deep-forest bg-deep-forest/5 shadow-xs'
                  : 'border-gray-200 bg-white hover:border-deep-forest/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="selectedBankAccount"
                    checked={isSelected}
                    onChange={() => setSelectedId(account.id)}
                    className="mt-1 accent-deep-forest"
                  />
                  <div>
                    <p className="text-xs font-bold text-deep-forest">{account.bankName}</p>
                    <p className="text-sm font-black font-mono tracking-wide text-leaf-olive">
                      {account.accountNumber}
                    </p>
                    <p className="text-[11px] text-muted-charcoal/70">a.n. {account.accountHolder}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(account.accountNumber);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-deep-forest/20 text-deep-forest hover:bg-deep-forest hover:text-white transition-all shrink-0"
                  title="Salin Nomor Rekening"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-leaf-olive" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
