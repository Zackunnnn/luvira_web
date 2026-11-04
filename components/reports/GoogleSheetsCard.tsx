'use client';

import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Link2,
  Trash2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface GoogleSheetsCardProps {
  title?: string;
  description?: string;
  scopeLabel?: string;
}

export default function GoogleSheetsCard({
  title = 'Integrasi Google Spreadsheet',
  description = 'Cermin data 1-arah real-time ke lembar kerja Google Sheets untuk kebutuhan rekap dan analisis.',
  scopeLabel,
}: GoogleSheetsCardProps) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [connection, setConnection] = useState<any>(null);

  // Form State
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetLabel, setSheetLabel] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  // UI Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch initial connection status
  const fetchConnection = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/sheets/connection');
      const data = await res.json();

      if (res.ok && data.success) {
        setServiceAccountEmail(data.serviceAccountEmail || '');
        setConnection(data.connection || null);
        if (data.connection) {
          setSheetUrl(data.connection.spreadsheetUrl || '');
          setAutoSync(Boolean(data.connection.autoSync));
        }
      } else {
        setErrorMessage(data.error || 'Gagal memuat status koneksi Google Sheets.');
      }
    } catch (_err: any) {
      setErrorMessage('Terjadi gangguan jaringan saat memuat koneksi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnection();
  }, []);

  const handleCopyEmail = () => {
    if (!serviceAccountEmail) return;
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) {
      setErrorMessage('Tautan atau ID Google Spreadsheet wajib diisi.');
      return;
    }

    try {
      setConnecting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch('/api/sheets/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sheetUrl.trim(),
          label: sheetLabel.trim() || undefined,
          autoSync,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghubungkan Google Spreadsheet.');
      }

      setConnection(data.connection);
      setSuccessMessage('Google Spreadsheet berhasil terhubung dan disinkronkan!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menghubungkan spreadsheet.');
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connection?.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyinkronkan data.');
      }

      setSuccessMessage(
        `Sinkronisasi berhasil! ${data.data?.rowsWritten || 0} baris data berhasil disinkronkan ke spreadsheet.`
      );
      // Refresh connection data to get updated lastSyncAt
      await fetchConnection();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat sinkronisasi.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Apakah Anda yakin ingin memutuskan sambungan Google Spreadsheet ini?')) {
      return;
    }

    try {
      setDisconnecting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch('/api/sheets/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: connection?.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memutuskan sambungan.');
      }

      setConnection(null);
      setSheetUrl('');
      setSheetLabel('');
      setSuccessMessage('Sambungan Google Spreadsheet telah diputuskan.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memutuskan sambungan.');
    } finally {
      setDisconnecting(false);
    }
  };

  // Format date helper: WIB format
  const formatWib = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return (
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(d) + ' WIB'
      );
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Header Card */}
      <div className="p-5 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/50">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-[#14532d] text-white rounded-xl shadow-xs shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900">{title}</h3>
              {scopeLabel && (
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-emerald-50 text-[#14532d] rounded-md border border-emerald-200">
                  {scopeLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">{description}</p>
          </div>
        </div>

        {connection && (
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                connection.lastStatus === 'SUCCESS'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {connection.lastStatus === 'SUCCESS' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Terhubung & Sinkron
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Perlu Sinkronisasi
                </>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Alerts / Feedback */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Galat: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">
              <span className="font-bold">Berhasil! </span>
              {successMessage}
            </div>
          </div>
        )}

        {/* Step 1: Bagikan ke Service Account */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
              Langkah 1: Berikan Hak Akses Editor
            </span>
            <span className="text-[11px] text-stone-500">Wajib dilakukan di Google Sheets</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Buka lembar kerja Google Spreadsheet Anda, klik tombol <strong>Bagikan (Share)</strong> di kanan atas,
            lalu tambahkan email Service Account Luvira berikut sebagai <strong>Editor</strong>:
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-white rounded-lg border border-stone-300 font-mono text-xs text-stone-800 truncate select-all">
              {serviceAccountEmail || 'Memuat kredensial service account...'}
            </div>
            <button
              type="button"
              onClick={handleCopyEmail}
              disabled={!serviceAccountEmail}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#14532d] hover:bg-[#0f3f22] text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Email'}</span>
            </button>
          </div>
        </div>

        {/* Peringatan Asumsi F6 (Cermin Satu Arah) */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Peringatan Cermin Satu Arah:</strong> Setiap proses sinkronisasi akan menimpa seluruh baris tab cermin Luvira.
            Jangan mengedit langsung data pada tab ini. Jika Anda ingin melakukan kalkulasi tambahan, buatlah tab/sheet baru dan referensikan rumusnya dari tab cermin.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin text-[#14532d]" />
            <span className="text-xs font-medium">Memeriksa sambungan spreadsheet...</span>
          </div>
        ) : connection ? (
          /* CONNECTED STATE */
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 flex items-center gap-2">
                    {connection.label || 'Google Spreadsheet Luvira'}
                  </h4>
                  <a
                    href={connection.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#14532d] hover:underline font-medium mt-1"
                  >
                    <span>Buka Lembar Kerja di Google Sheets</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#14532d] hover:bg-[#0f3f22] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                    title="Putuskan Sambungan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Putus</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Terakhir disinkronkan: </span>
                  <strong className="text-stone-700">{formatWib(connection.lastSyncAt)}</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sinkronisasi Otomatis: </span>
                  <strong className="text-stone-700">
                    {connection.autoSync ? 'Aktif (Harian - Pukul 00:00 WIB)' : 'Nonaktif'}
                  </strong>
                </div>
              </div>

              {connection.lastError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">
                  <span className="font-semibold">Galat terakhir: </span>
                  {connection.lastError}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* DISCONNECTED / CONNECT FORM */
          <form onSubmit={handleConnect} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Tautan (URL) atau ID Google Spreadsheet <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#14532d] focus:border-transparent outline-none transition"
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Salin tautan dari bilah alamat browser Anda saat membuka dokumen spreadsheet.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Label Spreadsheet (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Laporan Penjualan Pusat 2026"
                  value={sheetLabel}
                  onChange={(e) => setSheetLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#14532d] focus:border-transparent outline-none transition"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded text-[#14532d] focus:ring-[#14532d] border-stone-300 accent-[#14532d]"
                  />
                  <span>Sinkronisasi Otomatis Harian (Setiap Hari 00:00 WIB)</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={connecting || !sheetUrl.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#14532d] hover:bg-[#0f3f22] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" />
                <span>{connecting ? 'Menghubungkan & Memeriksa Akses...' : 'Hubungkan Spreadsheet'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
