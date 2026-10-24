// components/store/LocationSelectorModal.tsx
// ============================================================================
// Modal & Bar Pemilih Lokasi Pembeli Luvira 2.0
// Sesuai docs/LUVIRA_2_PLAN.md Bagian 7.4 (Fase 2 Butir 4)
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, X, ChevronRight, Check } from 'lucide-react';

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
  const [currentLocation, setCurrentLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('luvira_user_location');
      if (saved) {
        setCurrentLocation(JSON.parse(saved));
      }
    } catch {
      // Abaikan jika localStorage tidak tersedia
    }
  }, []);

  const handleOpenModal = () => {
    setIsOpen(true);
    if (provinces.length === 0) {
      setLoading(true);
      fetch('/api/shipping/destinations?type=provinces')
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setProvinces(json.data);
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
          <span className="font-medium text-stone-800 truncate" id="selected-location-label">
            {currentLocation.provinceName}
          </span>
        </div>
        <button
          type="button"
          id="btn-open-location-modal"
          onClick={handleOpenModal}
          className="ml-2 flex items-center font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <span>Ubah Lokasi</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Modal Pemilih Lokasi */}
      {isOpen && (
        <div
          id="location-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-emerald-700" />
                <h3 className="text-sm font-semibold text-stone-900">
                  Pilih Wilayah Pengiriman
                </h3>
              </div>
              <button
                type="button"
                id="btn-close-location-modal"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-2 text-xs text-stone-500">
              Ketersediaan stok dan asal pengiriman (Pusat Depok atau Gudang Yogyakarta) akan disesuaikan dengan wilayah Anda.
            </p>

            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
              {loading ? (
                <div className="py-6 text-center text-xs text-stone-400">
                  Memuat data provinsi...
                </div>
              ) : (
                provinces.map((p) => {
                  const isSelected = currentLocation.provinceId === p.id;
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => handleSelectProvince(p)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span>{p.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
