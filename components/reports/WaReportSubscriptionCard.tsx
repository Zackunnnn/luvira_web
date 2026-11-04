'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Clock,
  Calendar,
  Send,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

interface WaReportSubscriptionCardProps {
  title?: string;
  description?: string;
  scopeLabel?: string;
}

export default function WaReportSubscriptionCard({
  title = 'Langganan Laporan WhatsApp',
  description = 'Dapatkan rekap penjualan otomatis secara terjadwal langsung ke nomor WhatsApp Anda.',
  scopeLabel,
}: WaReportSubscriptionCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);

  const [userProfile, setUserProfile] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Form State
  const [reportType, setReportType] = useState<'RINGKAS_HARIAN' | 'MINGGUAN' | 'BULANAN'>('RINGKAS_HARIAN');
  const [sendTime, setSendTime] = useState('08:00');
  const [dayOfWeek, setDayOfWeek] = useState(1); // 1 = Senin
  const [dayOfMonth, setDayOfMonth] = useState(1); // Tanggal 1
  const [includeSheetLink, setIncludeSheetLink] = useState(true);
  const [includeFile, setIncludeFile] = useState(true);

  // Feedback Messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reportPreview, setReportPreview] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/reports/subscriptions');
      const data = await res.json();

      if (res.ok && data.success) {
        setUserProfile(data.user);
        setSubscriptions(data.subscriptions || []);

        // Jika sudah ada langganan harian, isi form
        const daily = (data.subscriptions || []).find((s: any) => s.reportType === 'RINGKAS_HARIAN');
        if (daily) {
          setSendTime(daily.sendTime || '08:00');
          setIncludeSheetLink(daily.includeSheetLink);
          setIncludeFile(daily.includeFile);
        }
      } else {
        setErrorMessage(data.error || 'Gagal memuat langganan laporan.');
      }
    } catch (_err) {
      setErrorMessage('Terjadi gangguan jaringan saat memuat langganan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.phone) {
      setErrorMessage('Nomor WhatsApp belum terdaftar di profil Anda.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const res = await fetch('/api/reports/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          sendTime,
          dayOfWeek: reportType === 'MINGGUAN' ? dayOfWeek : undefined,
          dayOfMonth: reportType === 'BULANAN' ? dayOfMonth : undefined,
          includeSheetLink,
          includeFile,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menyimpan langganan laporan.');
      }

      setSuccessMessage(data.message || 'Langganan laporan WhatsApp berhasil disimpan!');
      await fetchSubscriptions();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!userProfile?.phone) {
      setErrorMessage('Nomor WhatsApp belum terdaftar di profil Anda.');
      return;
    }

    try {
      setSendingNow(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      setReportPreview(null);

      const res = await fetch('/api/reports/subscriptions/send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          includeSheetLink,
          includeFile,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim laporan instan.');
      }

      setSuccessMessage(data.message || 'Laporan berhasil dimasukkan ke antrean WhatsApp!');
      setReportPreview(data.preview || null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat pengiriman instan.');
    } finally {
      setSendingNow(false);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('Hapus langganan laporan ini?')) return;

    try {
      setErrorMessage(null);
      const res = await fetch(`/api/reports/subscriptions/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghapus langganan.');
      }

      setSuccessMessage('Langganan berhasil dihapus.');
      await fetchSubscriptions();
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleToggleActive = async (sub: any) => {
    try {
      const res = await fetch(`/api/reports/subscriptions/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !sub.isActive }),
      });
      if (res.ok) {
        await fetchSubscriptions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50/50">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-[#14532d] text-white rounded-xl shadow-xs shrink-0">
            <MessageSquare className="w-5 h-5" />
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

        {userProfile?.phone && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/70 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tujuan: {userProfile.phone}</span>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Alerts */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Peringatan jika belum ada nomor HP */}
        {!loading && !userProfile?.phone && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="flex-1 leading-relaxed">
              <strong>Nomor WhatsApp belum terdaftar:</strong> Anda belum mengatur nomor WhatsApp penerima di profil Anda.
              Laporan otomatis tidak dapat dikirim sebelum nomor HP Anda didaftarkan.
            </div>
          </div>
        )}

        {/* Form Pengaturan Langganan */}
        <form onSubmit={handleSaveSubscription} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Frekuensi Laporan */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                Frekuensi Laporan
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#14532d] outline-none font-medium"
              >
                <option value="RINGKAS_HARIAN">Ringkasan Harian (Setiap Hari)</option>
                <option value="MINGGUAN">Laporan Mingguan</option>
                <option value="BULANAN">Laporan Bulanan</option>
              </select>
            </div>

            {/* Waktu Kirim (WIB) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-500" />
                Waktu Pengiriman (WIB)
              </label>
              <select
                value={sendTime}
                onChange={(e) => setSendTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#14532d] outline-none font-medium"
              >
                <option value="07:00">07:00 WIB (Pagi)</option>
                <option value="08:00">08:00 WIB (Awal Jam Kerja)</option>
                <option value="12:00">12:00 WIB (Siang)</option>
                <option value="17:00">17:00 WIB (Sore / Tutup Buku)</option>
                <option value="20:00">20:00 WIB (Malam)</option>
              </select>
            </div>

            {/* Opsi Tambahan untuk Mingguan / Bulanan */}
            {reportType === 'MINGGUAN' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Hari Pengiriman
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#14532d] outline-none font-medium"
                >
                  <option value={1}>Setiap Hari Senin</option>
                  <option value={2}>Setiap Hari Selasa</option>
                  <option value={3}>Setiap Hari Rabu</option>
                  <option value={4}>Setiap Hari Kamis</option>
                  <option value={5}>Setiap Hari Jumat</option>
                  <option value={6}>Setiap Hari Sabtu</option>
                  <option value={0}>Setiap Hari Minggu</option>
                </select>
              </div>
            )}

            {reportType === 'BULANAN' && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Tanggal Pengiriman
                </label>
                <select
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#14532d] outline-none font-medium"
                >
                  <option value={1}>Tanggal 1 (Awal Bulan)</option>
                  <option value={15}>Tanggal 15 (Tengah Bulan)</option>
                  <option value={31}>Akhir Bulan (Hari Terakhir)</option>
                </select>
              </div>
            )}
          </div>

          {/* Opsi Tautan & File */}
          <div className="pt-2 flex flex-wrap items-center gap-6">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-stone-700">
              <input
                type="checkbox"
                checked={includeSheetLink}
                onChange={(e) => setIncludeSheetLink(e.target.checked)}
                className="w-4 h-4 rounded text-[#14532d] focus:ring-[#14532d] border-stone-300 accent-[#14532d]"
              />
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Sertakan tautan Google Sheets cermin</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-stone-700">
              <input
                type="checkbox"
                checked={includeFile}
                onChange={(e) => setIncludeFile(e.target.checked)}
                className="w-4 h-4 rounded text-[#14532d] focus:ring-[#14532d] border-stone-300 accent-[#14532d]"
              />
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Sertakan tautan unduh berkas CSV (Tautan aman 15 menit)</span>
            </label>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving || !userProfile?.phone}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#14532d] hover:bg-[#0f3f22] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Simpan Langganan'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendNow}
              disabled={sendingNow || !userProfile?.phone}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 border border-stone-200"
            >
              {sendingNow ? <RefreshCw className="w-4 h-4 animate-spin text-[#14532d]" /> : <Send className="w-4 h-4 text-[#14532d]" />}
              <span>{sendingNow ? 'Mengirim ke WhatsApp...' : 'Kirim Sekarang (Tes)'}</span>
            </button>
          </div>
        </form>

        {/* Pratinjau Pesan yang Dikirim */}
        {reportPreview && (
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span>Pratinjau Pesan WhatsApp:</span>
              <button
                type="button"
                onClick={() => setReportPreview(null)}
                className="text-stone-400 hover:text-stone-600 text-[11px]"
              >
                Tutup Pratinjau
              </button>
            </div>
            <pre className="p-3 bg-white rounded-lg border border-stone-200 font-mono text-[11px] text-stone-800 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-60 overflow-y-auto">
              {reportPreview}
            </pre>
          </div>
        )}

        {/* Daftar Langganan Terdaftar */}
        <div className="pt-4 border-t border-stone-100">
          <h4 className="text-xs font-bold text-stone-800 mb-3">Langganan Laporan Aktif Anda</h4>
          {loading ? (
            <div className="py-6 flex items-center justify-center text-stone-400 gap-2 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-[#14532d]" />
              <span>Memuat langganan...</span>
            </div>
          ) : subscriptions.length === 0 ? (
            <p className="text-xs text-stone-400 italic">Belum ada langganan laporan WhatsApp yang didaftarkan.</p>
          ) : (
            <div className="space-y-2.5">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-stone-900 font-bold">
                        {sub.reportType === 'RINGKAS_HARIAN'
                          ? 'Ringkasan Harian'
                          : sub.reportType === 'MINGGUAN'
                          ? 'Laporan Mingguan'
                          : 'Laporan Bulanan'}
                      </strong>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          sub.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {sub.isActive ? 'AKTIF' : 'NONAKTIF'}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Waktu: {sub.sendTime} WIB</span>
                      {sub.lastSentPeriodKey && <span>Terakhir Terkirim: {sub.lastSentPeriodKey}</span>}
                      {sub.includeSheetLink && <span>• Sheet Link Aktif</span>}
                      {sub.includeFile && <span>• File Link Aktif</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(sub)}
                      className="px-2.5 py-1 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg text-xs font-semibold"
                    >
                      {sub.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubscription(sub.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Hapus Langganan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
