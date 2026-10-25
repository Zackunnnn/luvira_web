// components/store/LocationSelectorModal.tsx
// ============================================================================
// Modal & Bar Pemilih Lokasi Pembeli Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 7.4 (Fase 2 Butir 4)
// Fitur:
// 1. Render via React Portal ke document.body (bebas dari stacking context backdrop-blur)
// 2. Deteksi GPS Otomatis izin device (navigator.geolocation) -> /api/shipping/destinations?type=gps
// 3. Pilihan manual provinsi dengan pencarian instan
// 4. Tombol Batal eksplisit, backdrop click to close, dan shortcut tombol Escape
// ============================================================================

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X, ChevronRight, Check, Navigation, Loader2, AlertCircle, Search } from 'lucide-react';

export interface UserLocation {
  provinceId: string;
  provinceName: string;
  cityId?: string;
  cityName?: string;
}

const DEFAULT_LOCATION: UserLocation = {
  provinceId: '32',
  provinceName: 'Jawa Barat (Pusat)',
  cityName: 'Kota Depok',
};

export const LocationSelectorBar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('luvira_user_location');
      if (saved) {
        setCurrentLocation(JSON.parse(saved));
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, []);

  // Tutup modal ketika tombol Escape ditekan
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleOpenModal = () => {
    setIsOpen(true);
    setGpsError(null);
    setSearchQuery('');
    if (provinces.length === 0) {
      setLoading(true);
      fetch('/api/shipping/destinations?type=provinces')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setProvinces(json.data);
          }
        })
        .finally(() => setLoading(false));
    }
  };

  const handleSelectProvince = (prov: any) => {
    const newLoc: UserLocation = {
      provinceId: prov.id,
      provinceName: prov.name,
    };
    setCurrentLocation(newLoc);
    try {
      localStorage.setItem('luvira_user_location', JSON.stringify(newLoc));
    } catch {
      // Abaikan
    }
    setIsOpen(false);
  };

  const handleDetectGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Browser atau perangkat Anda tidak mendukung fitur deteksi GPS.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const res = await fetch(`/api/shipping/destinations?type=gps&lat=${lat}&lng=${lng}`);
          const json = await res.json();

          if (json.success && json.data) {
            const newLoc: UserLocation = {
              provinceId: json.data.provinceId,
              provinceName: json.data.provinceName,
              cityId: json.data.cityId,
              cityName: json.data.cityName,
            };
            setCurrentLocation(newLoc);
            try {
              localStorage.setItem('luvira_user_location', JSON.stringify(newLoc));
            } catch {
              // Abaikan
            }
            setIsOpen(false);
          } else {
            setGpsError(json.error || 'Gagal memetakan koordinat ke wilayah pengiriman.');
          }
        } catch {
          setGpsError('Koneksi terputus saat membaca lokasi server.');
        } finally {
          setIsDetectingGps(false);
        }
      },
      (error) => {
        setIsDetectingGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Izin akses GPS belum diberikan. Silakan pilih provinsi secara manual di bawah.');
        } else {
          setGpsError('Tidak dapat memperoleh sinyal GPS dari perangkat Anda.');
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const filteredProvinces = useMemo(() => {
    if (!searchQuery.trim()) return provinces;
    const q = searchQuery.toLowerCase().trim();
    return provinces.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [provinces, searchQuery]);

  // Modal JSX yang akan di-portal ke document.body
  const modalContent = isOpen && mounted ? (
    <div
      id="location-modal-backdrop"
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div
        id="location-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-md max-h-[90vh] flex-col rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="rounded-full bg-emerald-50 p-2 text-emerald-700">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Pilih Wilayah Pengiriman
              </h3>
              <p className="text-[11px] text-stone-500">
                Luvira Multi-Hub Routing (Depok & Yogyakarta)
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-location-modal"
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
            aria-label="Tutup Dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Konten Scrollable */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {/* Tombol Deteksi Lokasi Otomatis (GPS) */}
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-emerald-100/30 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <Navigation className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Deteksi Lokasi Otomatis (Izin GPS)
                  </h4>
                  <p className="text-[11px] text-emerald-800/80 mt-0.5 leading-relaxed">
                    Izinkan browser membaca posisi perangkat Anda untuk estimasi ongkir & gudang terdekat tercepat.
                  </p>
                </div>
              </div>
            </div>

            {gpsError && (
              <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{gpsError}</span>
              </div>
            )}

            <button
              type="button"
              id="btn-detect-gps-location"
              disabled={isDetectingGps}
              onClick={handleDetectGps}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-800 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-900 transition disabled:opacity-60"
            >
              {isDetectingGps ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Mendeteksi Lokasi Perangkat...</span>
                </>
              ) : (
                <>
                  <Navigation className="h-3.5 w-3.5" />
                  <span>Gunakan Lokasi Perangkat Saya</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-stone-200 w-full" />
            <span className="bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400 absolute">
              Atau Pilih Provinsi Manual
            </span>
          </div>

          {/* Kolom Pencarian Provinsi */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              id="input-search-province"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama provinsi (misal: Jawa Barat, DKI)..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 py-2 pl-9 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Daftar Provinsi */}
          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="py-8 text-center text-xs text-stone-400 flex flex-col items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                <span>Memuat data wilayah...</span>
              </div>
            ) : filteredProvinces.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                Tidak ada provinsi yang cocok dengan &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredProvinces.map((p) => {
                const isSelected = currentLocation.provinceId === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleSelectProvince(p)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60'
                        : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span>{p.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-700" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Modal: Tombol Batal */}
        <div className="border-t border-stone-100 pt-3">
          <button
            type="button"
            id="btn-cancel-location-modal"
            onClick={() => setIsOpen(false)}
            className="w-full rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition"
          >
            Batal / Tutup
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Top Location Bar */}
      <div
        id="location-selector-bar"
        className="flex items-center justify-between bg-stone-100 px-4 py-1.5 text-xs text-stone-600 sm:px-6"
      >
        <div className="flex items-center space-x-1.5 truncate">
          <MapPin className="h-3.5 w-3.5 text-emerald-700 flex-shrink-0" />
          <span className="text-stone-500">Dikirim ke:</span>
          <span className="font-semibold text-stone-900 truncate" id="selected-location-label">
            {currentLocation.cityName ? `${currentLocation.cityName}, ` : ''}{currentLocation.provinceName}
          </span>
        </div>
        <button
          type="button"
          id="btn-open-location-modal"
          onClick={handleOpenModal}
          className="ml-2 flex items-center font-semibold text-emerald-700 hover:text-emerald-800 transition cursor-pointer"
        >
          <span>Ubah Lokasi</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Render via Portal ke document.body agar tidak terpotong backdrop-blur header */}
      {mounted && typeof document !== 'undefined' && modalContent && createPortal(modalContent, document.body)}
    </>
  );
};
